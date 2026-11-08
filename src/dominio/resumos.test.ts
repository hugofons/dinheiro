import { describe, expect, it } from 'vitest';
import { gastosPorCategoria, movimentosDoMes, serieMeses, totaisMes, variacao } from './resumos';
import type { Movimento } from './tipos';

let n = 0;
const mv = (data: string, tipo: Movimento['tipo'], valorCent: number, categoriaId: string): Movimento => ({
  id: `m${++n}`, data, tipo, valorCent, categoriaId, nota: '', criadoEm: n,
});

const movs: Movimento[] = [
  mv('2026-09-10', 'despesa', 1000, 'super'),
  mv('2026-10-01', 'receita', 150000, 'salario'),
  mv('2026-10-05', 'despesa', 3000, 'super'),
  mv('2026-10-05', 'despesa', 1000, 'rest'),
  mv('2026-10-31', 'despesa', 6000, 'casa'),
  mv('2026-11-02', 'despesa', 2500, 'super'),
];
const out = { ano: 2026, mes: 10 };

describe('totaisMes', () => {
  it('soma só o mês pedido', () => {
    expect(totaisMes(movs, out)).toEqual({ gastos: 10000, receitas: 150000, saldo: 140000 });
    expect(totaisMes(movs, { ano: 2026, mes: 8 })).toEqual({ gastos: 0, receitas: 0, saldo: 0 });
  });
});

describe('gastosPorCategoria', () => {
  it('ordena do maior para o menor e calcula percentagens', () => {
    const r = gastosPorCategoria(movs, out);
    expect(r.map((x) => x.categoriaId)).toEqual(['casa', 'super', 'rest']);
    expect(r.map((x) => x.total)).toEqual([6000, 3000, 1000]);
    expect(r.map((x) => x.percent)).toEqual([60, 30, 10]);
  });
  it('mês sem gastos dá lista vazia', () => {
    expect(gastosPorCategoria(movs, { ano: 2025, mes: 1 })).toEqual([]);
  });
});

describe('serieMeses', () => {
  it('devolve 12 meses, do mais antigo ao mais recente, com meses vazios a zero', () => {
    const s = serieMeses(movs, { ano: 2026, mes: 11 });
    expect(s).toHaveLength(12);
    expect(s[0].mes).toEqual({ ano: 2025, mes: 12 });
    expect(s[11].mes).toEqual({ ano: 2026, mes: 11 });
    expect(s[0]).toMatchObject({ gastos: 0, receitas: 0, saldo: 0 });
    expect(s[10]).toMatchObject({ gastos: 10000, receitas: 150000, saldo: 140000 });
    expect(s[11]).toMatchObject({ gastos: 2500, receitas: 0, saldo: -2500 });
  });
  it('filtra por categoria (só despesas dessa categoria)', () => {
    const s = serieMeses(movs, { ano: 2026, mes: 11 }, 3, 'super');
    expect(s.map((x) => x.gastos)).toEqual([1000, 3000, 2500]);
    expect(s.every((x) => x.receitas === 0)).toBe(true);
  });
});

describe('movimentosDoMes', () => {
  it('agrupa por dia, dias e movimentos mais recentes primeiro', () => {
    const g = movimentosDoMes(movs, out);
    expect(g.map((x) => x.data)).toEqual(['2026-10-31', '2026-10-05', '2026-10-01']);
    expect(g[1].movs.map((m) => m.categoriaId)).toEqual(['rest', 'super']);
  });
});

describe('variacao', () => {
  it('percentagem arredondada, null sem base', () => {
    expect(variacao(112, 100)).toBe(12);
    expect(variacao(50, 100)).toBe(-50);
    expect(variacao(10, 0)).toBeNull();
  });
});
