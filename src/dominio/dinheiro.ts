export const MAX_CENT = 100_000_000; // 1 000 000 €

/**
 * Lê um valor escrito pelo utilizador e devolve cêntimos (> 0), ou null se inválido.
 * Aceita "12,5", "1.234,56", "1234.5", "1 234,56". Com só pontos, "1.234" e "1.234.567"
 * são lidos como milhares (é o que um português escreve), "12.5" como decimal.
 */
export function lerValor(texto: string): number | null {
  let t = texto.replace(/[\s  ]/g, '');
  if (!t) return null;
  const temVirgula = t.includes(',');
  const temPonto = t.includes('.');
  if (temVirgula && temPonto) {
    if (!/^\d{1,3}(\.\d{3})+,\d{1,2}$/.test(t)) return null;
    t = t.replace(/\./g, '').replace(',', '.');
  } else if (temVirgula) {
    t = t.replace(',', '.');
  } else if (temPonto && /^\d{1,3}(\.\d{3})+$/.test(t)) {
    t = t.replace(/\./g, '');
  }
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  const [inteiros, dec = ''] = t.split('.');
  const cent = Number(inteiros) * 100 + Number(dec.padEnd(2, '0'));
  if (!Number.isSafeInteger(cent) || cent <= 0 || cent > MAX_CENT) return null;
  return cent;
}

/** 1250 -> "12,50" (sem separador de milhares; usado no CSV e nos campos de edição). */
export function centParaTexto(cent: number): string {
  const sinal = cent < 0 ? '-' : '';
  const a = Math.abs(cent);
  return `${sinal}${Math.floor(a / 100)},${String(a % 100).padStart(2, '0')}`;
}

const fmt = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });

/** 123456 -> "1234,56 €" (formato pt-PT). */
export function formatarEuros(cent: number): string {
  return fmt.format(cent / 100);
}
