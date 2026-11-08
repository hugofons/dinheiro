import { somarMeses, type Mes } from './datas';
import type { Acerto, Conta, Movimento } from './tipos';

/** Quanto um movimento muda o saldo de uma conta (em cêntimos). */
export function efeito(m: Movimento, contaId: string): number {
  if (m.tipo === 'transferencia') {
    if (m.contaId === contaId) return -m.valorCent;
    if (m.contaDestinoId === contaId) return m.valorCent;
    return 0;
  }
  if (m.contaId !== contaId) return 0;
  return m.tipo === 'despesa' ? -m.valorCent : m.valorCent;
}

/** O movimento foi feito depois do acerto (data posterior, ou mesmo dia e registado depois)? */
function depoisDe(m: Movimento, a: Acerto): boolean {
  return m.data > a.data || (m.data === a.data && m.criadoEm > a.criadoEm);
}

const ordemAcerto = (x: Acerto, y: Acerto) => (x.data === y.data ? x.criadoEm - y.criadoEm : x.data < y.data ? -1 : 1);

/** Saldo de uma conta no fim do dia `dia` ('AAAA-MM-DD'). */
export function saldoNoFimDe(contaId: string, movs: Movimento[], acertos: Acerto[], dia: string): number {
  const daConta = acertos.filter((a) => a.contaId === contaId).sort(ordemAcerto);
  const antes = daConta.filter((a) => a.data <= dia);
  const ref = antes[antes.length - 1];
  let soma = 0;
  if (ref) {
    for (const m of movs) if (m.data <= dia && depoisDe(m, ref)) soma += efeito(m, contaId);
    return ref.saldoCent + soma;
  }
  const seguinte = daConta[0];
  if (seguinte) {
    for (const m of movs) if (m.data > dia && !depoisDe(m, seguinte)) soma += efeito(m, contaId);
    return seguinte.saldoCent - soma;
  }
  for (const m of movs) if (m.data <= dia) soma += efeito(m, contaId);
  return soma;
}

/** Saldo atual (inclui movimentos com data futura). */
export function saldoConta(contaId: string, movs: Movimento[], acertos: Acerto[]): number {
  return saldoNoFimDe(contaId, movs, acertos, '9999-12-31');
}

export type Patrimonio = { total: number; porConta: Record<string, number> };

function patrimonioEm(contas: Conta[], movs: Movimento[], acertos: Acerto[], dia: string): Patrimonio {
  const porConta: Record<string, number> = {};
  let total = 0;
  for (const c of contas) {
    const s = saldoNoFimDe(c.id, movs, acertos, dia);
    porConta[c.id] = s;
    total += s;
  }
  return { total, porConta };
}

export function totalContas(contas: Conta[], movs: Movimento[], acertos: Acerto[]): Patrimonio {
  return patrimonioEm(contas, movs, acertos, '9999-12-31');
}

function ultimoDia(m: Mes): string {
  const dias = new Date(m.ano, m.mes, 0).getDate();
  return `${m.ano}-${String(m.mes).padStart(2, '0')}-${dias}`;
}

/** Total das contas no fim de cada um dos `n` meses até `ate` (do mais antigo ao mais recente). */
export function seriePatrimonio(contas: Conta[], movs: Movimento[], acertos: Acerto[], ate: Mes, n = 12): (Patrimonio & { mes: Mes })[] {
  const serie: (Patrimonio & { mes: Mes })[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const mes = somarMeses(ate, -i);
    serie.push({ mes, ...patrimonioEm(contas, movs, acertos, ultimoDia(mes)) });
  }
  return serie;
}
