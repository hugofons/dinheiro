export type Mes = { ano: number; mes: number }; // mes 1–12

const NOMES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const p2 = (n: number) => String(n).padStart(2, '0');

export function mesDe(data: string): Mes {
  return { ano: Number(data.slice(0, 4)), mes: Number(data.slice(5, 7)) };
}

export function mesAtual(hoje: Date = new Date()): Mes {
  return { ano: hoje.getFullYear(), mes: hoje.getMonth() + 1 };
}

export function somarMeses(m: Mes, n: number): Mes {
  const total = m.ano * 12 + (m.mes - 1) + n;
  return { ano: Math.floor(total / 12), mes: (((total % 12) + 12) % 12) + 1 };
}

export function compararMeses(a: Mes, b: Mes): number {
  return a.ano * 12 + a.mes - (b.ano * 12 + b.mes);
}

export function chaveMes(m: Mes): string {
  return `${m.ano}-${p2(m.mes)}`;
}

export function nomeMes(m: Mes): string {
  return `${NOMES[m.mes - 1]} ${m.ano}`;
}

export function nomeMesSo(m: Mes): string {
  return NOMES[m.mes - 1];
}

export function nomeMesCurto(m: Mes): string {
  return CURTOS[m.mes - 1];
}

export function hojeISO(hoje: Date = new Date()): string {
  return `${hoje.getFullYear()}-${p2(hoje.getMonth() + 1)}-${p2(hoje.getDate())}`;
}

export function isoParaPt(d: string): string {
  return `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
}

export function ptParaIso(d: string): string | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(d.trim());
  if (!m) return null;
  const [dia, mes, ano] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(ano, mes - 1, dia);
  if (dt.getFullYear() !== ano || dt.getMonth() !== mes - 1 || dt.getDate() !== dia) return null;
  return `${ano}-${p2(mes)}-${p2(dia)}`;
}

/** "2026-11-08" -> "sábado, 8 nov" */
export function nomeDia(d: string): string {
  const [a, m, dia] = d.split('-').map(Number);
  const dt = new Date(a, m - 1, dia);
  const sem = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][dt.getDay()];
  return `${sem}, ${dia} ${CURTOS[m - 1]}`;
}
