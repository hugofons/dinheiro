export type Tipo = 'despesa' | 'receita';

export interface Categoria {
  id: string;
  nome: string;
  tipo: Tipo;
  cor: string;
  escondida: boolean;
  ordem: number;
}

export interface Movimento {
  id: string;
  tipo: Tipo;
  valorCent: number;
  categoriaId: string;
  data: string; // AAAA-MM-DD
  nota: string;
  criadoEm: number;
}

export const NOTA_MAX = 100;

/** Paleta de joias, a combinar com o fundo rubi. */
export const PALETA = [
  '#f2a7b5', // quartzo rosa
  '#8fb0ff', // safira
  '#c39bff', // ametista
  '#ff7a8c', // rubi
  '#6fd6bd', // jade
  '#f3c56b', // ouro
  '#d9a07a', // cobre
  '#7ee0a5', // esmeralda
  '#e8d9c4', // champanhe
  '#b9a6b0', // pérola
];

export const NOMES_CORES = ['Quartzo rosa', 'Safira', 'Ametista', 'Rubi', 'Jade', 'Ouro', 'Cobre', 'Esmeralda', 'Champanhe', 'Pérola'];

/** Paleta da primeira versão (para migrar categorias já guardadas). */
export const PALETA_ANTIGA = ['#0f766e', '#2563eb', '#7c3aed', '#db2777', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0891b2', '#64748b'];

export function migrarCor(cor: string): string {
  const i = PALETA_ANTIGA.indexOf(cor.toLowerCase());
  return i === -1 ? cor : PALETA[i];
}
