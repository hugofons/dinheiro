import { chaveMes, somarMeses, type Mes } from './datas';
import type { Movimento } from './tipos';

export type Totais = { gastos: number; receitas: number; saldo: number };
export type PontoSerie = Totais & { mes: Mes };

const doMes = (movs: Movimento[], m: Mes) => {
  const k = chaveMes(m);
  return movs.filter((x) => x.data.startsWith(k));
};

function somar(movs: Movimento[]): Totais {
  let gastos = 0;
  let receitas = 0;
  for (const m of movs) {
    if (m.tipo === 'despesa') gastos += m.valorCent;
    else receitas += m.valorCent;
  }
  return { gastos, receitas, saldo: receitas - gastos };
}

export function totaisMes(movs: Movimento[], m: Mes): Totais {
  return somar(doMes(movs, m));
}

export function gastosPorCategoria(movs: Movimento[], m: Mes): { categoriaId: string; total: number; percent: number }[] {
  const porCat = new Map<string, number>();
  let total = 0;
  for (const x of doMes(movs, m)) {
    if (x.tipo !== 'despesa') continue;
    porCat.set(x.categoriaId, (porCat.get(x.categoriaId) ?? 0) + x.valorCent);
    total += x.valorCent;
  }
  return [...porCat.entries()]
    .map(([categoriaId, t]) => ({ categoriaId, total: t, percent: Math.round((t / total) * 100) }))
    .sort((a, b) => b.total - a.total);
}

export function serieMeses(movs: Movimento[], ate: Mes, n = 12, categoriaId?: string): PontoSerie[] {
  const filtrados = categoriaId ? movs.filter((x) => x.tipo === 'despesa' && x.categoriaId === categoriaId) : movs;
  const porMes = new Map<string, Movimento[]>();
  for (const x of filtrados) {
    const k = x.data.slice(0, 7);
    let l = porMes.get(k);
    if (!l) porMes.set(k, (l = []));
    l.push(x);
  }
  const serie: PontoSerie[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const mes = somarMeses(ate, -i);
    serie.push({ mes, ...somar(porMes.get(chaveMes(mes)) ?? []) });
  }
  return serie;
}

export function movimentosDoMes(movs: Movimento[], m: Mes): { data: string; movs: Movimento[] }[] {
  const ordenados = [...doMes(movs, m)].sort((a, b) => (a.data === b.data ? b.criadoEm - a.criadoEm : a.data < b.data ? 1 : -1));
  const grupos: { data: string; movs: Movimento[] }[] = [];
  for (const x of ordenados) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.data === x.data) ultimo.movs.push(x);
    else grupos.push({ data: x.data, movs: [x] });
  }
  return grupos;
}

export function variacao(atual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return Math.round(((atual - anterior) / anterior) * 100);
}
