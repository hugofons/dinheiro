import { describe, expect, it } from 'vitest';
import { efeito, saldoConta, saldoNoFimDe, seriePatrimonio, totalContas } from './contas';
import type { Acerto, Conta, Movimento } from './tipos';

let n = 0;
const mv = (data: string, tipo: Movimento['tipo'], valorCent: number, contaId = 'a', contaDestinoId?: string, criadoEm = ++n * 10): Movimento => ({
  id: `m${n}`, data, tipo, valorCent, categoriaId: tipo === 'transferencia' ? '' : 'c', contaId, contaDestinoId, nota: '', criadoEm,
});
const ac = (contaId: string, data: string, saldoCent: number, criadoEm: number): Acerto => ({ id: `a${criadoEm}`, contaId, data, saldoCent, criadoEm });

describe('efeito', () => {
  it('despesa tira, receita põe, transferência tira na origem e põe no destino', () => {
    expect(efeito(mv('2026-11-01', 'despesa', 500), 'a')).toBe(-500);
    expect(efeito(mv('2026-11-01', 'receita', 500), 'a')).toBe(500);
    const t = mv('2026-11-01', 'transferencia', 300, 'a', 'b');
    expect(efeito(t, 'a')).toBe(-300);
    expect(efeito(t, 'b')).toBe(300);
    expect(efeito(t, 'c')).toBe(0);
    expect(efeito(mv('2026-11-01', 'despesa', 500, 'b'), 'a')).toBe(0);
  });
});

describe('saldoConta', () => {
  it('sem acertos é a soma dos movimentos', () => {
    const movs = [mv('2026-10-01', 'receita', 100000), mv('2026-10-02', 'despesa', 2500)];
    expect(saldoConta('a', movs, [], '2026-12-31')).toBe(97500);
  });

  it('com acerto conta só o que foi registado depois dele', () => {
    const antes = mv('2026-11-05', 'despesa', 1000, 'a', undefined, 100);
    const mesmoDiaAntes = mv('2026-11-08', 'despesa', 200, 'a', undefined, 150);
    const acerto = ac('a', '2026-11-08', 50000, 200);
    const mesmoDiaDepois = mv('2026-11-08', 'despesa', 300, 'a', undefined, 250);
    const depois = mv('2026-11-09', 'receita', 1000, 'a', undefined, 260);
    const esquecidoAntigo = mv('2026-11-01', 'despesa', 999, 'a', undefined, 300); // registado depois mas com data antiga: já estava no banco
    expect(saldoConta('a', [antes, mesmoDiaAntes, mesmoDiaDepois, depois, esquecidoAntigo], [acerto], '2026-12-31')).toBe(50000 - 300 + 1000);
  });

  it('usa o acerto mais recente', () => {
    const acertos = [ac('a', '2026-10-01', 1000, 1), ac('a', '2026-11-01', 7000, 2), ac('b', '2026-11-05', 99, 3)];
    expect(saldoConta('a', [mv('2026-11-02', 'despesa', 500)], acertos, '2026-12-31')).toBe(6500);
  });
});

describe('saldoNoFimDe', () => {
  const acertos = [ac('a', '2026-11-08', 50000, 1000)];
  const movs = [
    mv('2026-10-20', 'despesa', 3000, 'a', undefined, 1),
    mv('2026-11-03', 'despesa', 2000, 'a', undefined, 2),
    mv('2026-11-10', 'receita', 10000, 'a', undefined, 1001),
  ];
  it('antes do primeiro acerto anda para trás a partir dele', () => {
    expect(saldoNoFimDe('a', movs, acertos, '2026-10-31')).toBe(52000);
    expect(saldoNoFimDe('a', movs, acertos, '2026-10-19')).toBe(55000);
  });
  it('depois do acerto anda para a frente', () => {
    expect(saldoNoFimDe('a', movs, acertos, '2026-11-08')).toBe(50000);
    expect(saldoNoFimDe('a', movs, acertos, '2026-11-30')).toBe(60000);
  });
  it('transferências mexem nas duas contas', () => {
    const t = [mv('2026-11-02', 'transferencia', 4000, 'a', 'b')];
    expect(saldoNoFimDe('a', t, [], '2026-11-30')).toBe(-4000);
    expect(saldoNoFimDe('b', t, [], '2026-11-30')).toBe(4000);
  });
});

describe('totais e série', () => {
  const contas: Conta[] = [
    { id: 'a', nome: 'Ordem', tipo: 'ordem', cor: '#f00', arquivada: false, ordem: 0 },
    { id: 'b', nome: 'Poupança', tipo: 'poupanca', cor: '#0f0', arquivada: false, ordem: 1 },
  ];
  const acertos = [ac('a', '2026-11-01', 100000, 1), ac('b', '2026-11-01', 500000, 2)];
  const movs = [mv('2026-11-02', 'transferencia', 20000, 'a', 'b', 3), mv('2026-11-03', 'despesa', 5000, 'a', undefined, 4)];

  it('total das contas: transferências não mudam o total, despesas sim', () => {
    expect(totalContas(contas, movs, acertos, '2026-12-31')).toEqual({ total: 595000, porConta: { a: 75000, b: 520000 } });
  });

  it('série de património no fim de cada mês', () => {
    const s = seriePatrimonio(contas, movs, acertos, { ano: 2026, mes: 11 }, 2);
    expect(s.map((p) => p.mes)).toEqual([{ ano: 2026, mes: 10 }, { ano: 2026, mes: 11 }]);
    expect(s[0].total).toBe(600000);
    expect(s[1]).toEqual({ mes: { ano: 2026, mes: 11 }, total: 595000, porConta: { a: 75000, b: 520000 } });
  });
});

describe('movimentos com data futura', () => {
  it('não contam para o saldo de hoje, mas contam no fim do mês', () => {
    const acertos = [ac('a', '2026-11-08', 235000, 5000)];
    const futuro = mv('2026-11-22', 'despesa', 2500, 'a', undefined, 1);
    expect(saldoConta('a', [futuro], acertos, '2026-11-08')).toBe(235000);
    expect(totalContas([{ id: 'a', nome: 'A', tipo: 'ordem', cor: '#000', arquivada: false, ordem: 0 }], [futuro], acertos, '2026-11-08').total).toBe(235000);
    expect(saldoNoFimDe('a', [futuro], acertos, '2026-11-30')).toBe(232500);
  });
});
