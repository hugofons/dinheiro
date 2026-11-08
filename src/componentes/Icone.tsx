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
} as const;

export type NomeIcone = keyof typeof CAMINHOS;

export function Icone({ nome }: { nome: NomeIcone }) {
  return (
    <svg class="icone" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d={CAMINHOS[nome]} />
    </svg>
  );
}
