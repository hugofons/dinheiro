const CAMINHOS = {
  mais: 'M12 5v14M5 12h14',
  calendario: 'M4 7h16v13H4zM4 11h16M8 3v4M16 3v4',
  grafico: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  definicoes: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4',
  esquerda: 'M15 18l-6-6 6-6',
  direita: 'M9 18l6-6-6-6',
  fechar: 'M6 6l12 12M18 6L6 18',
  apagar: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  aviso: 'M12 3l10 18H2zM12 10v5M12 18v0',
  carteira: 'M3 7h15a3 3 0 0 1 3 3v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l12-4v4M16 14h2',
  banco: 'M3 10h18M12 3l9 7H3zM5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 21h18',
  cofre: 'M4 5h16v14H4zM4 19v2M20 19v2M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0M12 9v1M15 12h-1',
  notas: 'M2 7h20v10H2zM12 12m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0M5 10v4M19 10v4',
  cartao: 'M2 6h20v12H2zM2 10h20M6 15h4',
  investimento: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  transferencia: 'M4 8h14M14 4l4 4-4 4M20 16H6M10 12l-4 4 4 4',
} as const;

export type NomeIcone = keyof typeof CAMINHOS;

export function Icone({ nome }: { nome: NomeIcone }) {
  return (
    <svg class="icone" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d={CAMINHOS[nome]} />
    </svg>
  );
}
