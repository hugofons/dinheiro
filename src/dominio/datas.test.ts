import { describe, expect, it } from 'vitest';
import { chaveMes, hojeISO, isoParaPt, mesAtual, mesDe, nomeMes, nomeMesCurto, ptParaIso, somarMeses } from './datas';

describe('meses', () => {
  it('somarMeses atravessa anos', () => {
    expect(somarMeses({ ano: 2026, mes: 1 }, -1)).toEqual({ ano: 2025, mes: 12 });
    expect(somarMeses({ ano: 2026, mes: 11 }, 14)).toEqual({ ano: 2028, mes: 1 });
    expect(somarMeses({ ano: 2026, mes: 3 }, -15)).toEqual({ ano: 2024, mes: 12 });
  });
  it('navegar 12 meses seguidos não salta nem repete', () => {
    const vistos = new Set<string>();
    let m = { ano: 2026, mes: 1 };
    for (let i = 0; i < 12; i++) { vistos.add(chaveMes(m)); m = somarMeses(m, 1); }
    expect(vistos.size).toBe(12);
    expect(chaveMes(m)).toBe('2027-01');
  });
  it('nomes', () => {
    expect(nomeMes({ ano: 2026, mes: 11 })).toBe('novembro 2026');
    expect(nomeMesCurto({ ano: 2026, mes: 2 })).toBe('fev');
    expect(chaveMes({ ano: 2026, mes: 3 })).toBe('2026-03');
  });
  it('mesDe e mesAtual', () => {
    expect(mesDe('2026-01-31')).toEqual({ ano: 2026, mes: 1 });
    expect(mesAtual(new Date(2026, 10, 8))).toEqual({ ano: 2026, mes: 11 });
  });
});

describe('dias', () => {
  it('hojeISO usa hora local', () => {
    expect(hojeISO(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
    expect(hojeISO(new Date(2026, 0, 5, 0, 10))).toBe('2026-01-05');
  });
  it('conversões pt <-> iso', () => {
    expect(isoParaPt('2026-01-05')).toBe('05/01/2026');
    expect(ptParaIso('05/01/2026')).toBe('2026-01-05');
    expect(ptParaIso('5/1/2026')).toBe('2026-01-05');
    expect(ptParaIso('31/02/2026')).toBeNull();
    expect(ptParaIso('2026-01-05')).toBeNull();
  });
});
