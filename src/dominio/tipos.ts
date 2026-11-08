export type Tipo = 'despesa' | 'receita';

export interface Categoria {
  id: string;
  nome: string;
  tipo: Tipo;
  cor: string;
  escondida: boolean;
  ordem: number;
}

/** Tipo de um movimento. As transferências passam dinheiro entre contas e não são gastos nem receitas. */
export type TipoMovimento = Tipo | 'transferencia';

export interface Movimento {
  id: string;
  tipo: TipoMovimento;
  valorCent: number;
  categoriaId: string; // '' nas transferências
  contaId: string; // conta de onde sai (despesa, transferência) ou onde entra (receita)
  contaDestinoId?: string; // só nas transferências
  data: string; // AAAA-MM-DD
  nota: string;
  criadoEm: number;
}

export type TipoConta = 'ordem' | 'poupanca' | 'dinheiro' | 'cartao' | 'investimento';

export const TIPOS_CONTA: { tipo: TipoConta; nome: string }[] = [
  { tipo: 'ordem', nome: 'Conta à ordem' },
  { tipo: 'poupanca', nome: 'Poupança' },
  { tipo: 'dinheiro', nome: 'Dinheiro' },
  { tipo: 'cartao', nome: 'Cartão de crédito' },
  { tipo: 'investimento', nome: 'Investimentos' },
];

export interface Conta {
  id: string;
  nome: string;
  tipo: TipoConta;
  cor: string;
  arquivada: boolean;
  ordem: number;
}

/** "Nesta data, depois do que já estava registado, a conta tinha este saldo." */
export interface Acerto {
  id: string;
  contaId: string;
  data: string; // AAAA-MM-DD
  saldoCent: number; // pode ser negativo
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
