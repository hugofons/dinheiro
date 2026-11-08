import { describe, expect, it } from 'vitest';
import { gerarCsv, lerCsv } from './csv';
import type { Categoria, Movimento } from './tipos';

const cats: Categoria[] = [
  { id: 'c1', nome: 'Supermercado', tipo: 'despesa', cor: '#000', escondida: false, ordem: 0 },
  { id: 'c2', nome: 'Salário', tipo: 'receita', cor: '#000', escondida: false, ordem: 1 },
];
const movs: Movimento[] = [
  { id: 'a', tipo: 'despesa', valorCent: 1250, categoriaId: 'c1', data: '2026-11-08', nota: 'a;b "c"\nd', criadoEm: 1 },
  { id: 'b', tipo: 'receita', valorCent: 150000, categoriaId: 'c2', data: '2026-11-01', nota: '', criadoEm: 2 },
];

describe('gerarCsv', () => {
  it('começa com BOM e cabeçalho, usa ; \\r\\n e formato português', () => {
    const csv = gerarCsv(movs, cats);
    expect(csv.startsWith('﻿id;data;tipo;categoria;valor;nota\r\n')).toBe(true);
    expect(csv).toContain('b;01/11/2026;receita;Salário;1500,00;\r\n');
    expect(csv).toContain('a;08/11/2026;despesa;Supermercado;12,50;"a;b ""c""\nd"\r\n');
  });
});

describe('lerCsv', () => {
  it('ida e volta preserva tudo', () => {
    const r = lerCsv(gerarCsv(movs, cats));
    if ('erro' in r) throw new Error('erro');
    expect(r.invalidas).toBe(0);
    expect(r.linhas).toEqual([
      { id: 'b', data: '2026-11-01', tipo: 'receita', categoria: 'Salário', valorCent: 150000, nota: '' },
      { id: 'a', data: '2026-11-08', tipo: 'despesa', categoria: 'Supermercado', valorCent: 1250, nota: 'a;b "c"\nd' },
    ]);
  });

  it('lê ficheiro regravado pelo Excel (sem BOM, \\n, id vazio)', () => {
    const r = lerCsv('id;data;tipo;categoria;valor;nota\n;03/11/2026;despesa;Café;1,20;\n');
    if ('erro' in r) throw new Error('erro');
    expect(r.linhas).toEqual([{ id: null, data: '2026-11-03', tipo: 'despesa', categoria: 'Café', valorCent: 120, nota: '' }]);
  });

  it('conta linhas inválidas e ignora linhas vazias', () => {
    const r = lerCsv('id;data;tipo;categoria;valor;nota\r\nx;03/11/2026;despesa;Café;abc;\r\ny;31/02/2026;despesa;Café;1;\r\nz;03/11/2026;outro;Café;1;\r\nw;03/11/2026;despesa;;1;\r\n\r\n');
    if ('erro' in r) throw new Error('erro');
    expect(r.linhas).toEqual([]);
    expect(r.invalidas).toBe(4);
  });

  it('cabeçalho diferente é erro', () => {
    expect(lerCsv('data,valor\n01/01/2026,3')).toEqual({ erro: 'cabecalho' });
    expect(lerCsv('')).toEqual({ erro: 'cabecalho' });
  });
});
