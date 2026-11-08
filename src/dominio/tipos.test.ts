import { describe, expect, it } from 'vitest';
import { migrarCor, PALETA, PALETA_ANTIGA } from './tipos';

describe('migrarCor', () => {
  it('troca cada cor antiga pela cor nova na mesma posição', () => {
    PALETA_ANTIGA.forEach((antiga, i) => expect(migrarCor(antiga)).toBe(PALETA[i]));
  });
  it('ignora maiúsculas e mantém cores desconhecidas', () => {
    expect(migrarCor('#0F766E')).toBe(PALETA[0]);
    expect(migrarCor('#123456')).toBe('#123456');
  });
  it('a paleta nova tem 10 cores diferentes', () => {
    expect(new Set(PALETA).size).toBe(10);
  });
});
