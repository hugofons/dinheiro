import { describe, expect, it } from 'vitest';
import { centParaTexto, formatarEuros, lerValor } from './dinheiro';

describe('lerValor', () => {
  it.each([
    ['12,5', 1250],
    ['12,50', 1250],
    ['1.234,56', 123456],
    ['1234.5', 123450],
    [' 12 ', 1200],
    ['0,01', 1],
    ['1000000', 100000000],
    ['1 234,56', 123456],
  ])('%s -> %i', (texto, esperado) => {
    expect(lerValor(texto)).toBe(esperado);
  });

  it.each(['12,345', '0', '0,00', '-3', 'abc', '', '1000000,01', '1,2,3', '12.'])('rejeita %s', (texto) => {
    expect(lerValor(texto)).toBeNull();
  });
});

describe('formatação', () => {
  it('centParaTexto', () => {
    expect(centParaTexto(1250)).toBe('12,50');
    expect(centParaTexto(5)).toBe('0,05');
    expect(centParaTexto(123456)).toBe('1234,56');
  });
  it('formatarEuros usa pt-PT', () => {
    const t = formatarEuros(123456).replace(/\s/g, ' ');
    expect(t).toContain('1234,56');
    expect(t).toContain('€');
  });
});
