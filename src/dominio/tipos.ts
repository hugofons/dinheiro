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

export const PALETA = ['#0f766e', '#2563eb', '#7c3aed', '#db2777', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0891b2', '#64748b'];
