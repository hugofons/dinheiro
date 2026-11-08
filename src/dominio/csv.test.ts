import { describe, expect, it } from 'vitest';
import { gerarCsv, lerCsv } from './csv';
import type { Acerto, Categoria, Conta, Movimento } from './tipos';

const cats: Categoria[] = [
  { id: 'c1', nome: 'Supermercado', tipo: 'despesa', cor: '#000', escondida: false, ordem: 0 },
  { id: 'c2', nome: 'Salário', tipo: 'receita', cor: '#000', escondida: false, ordem: 1 },
];
const contas: Conta[] = [
  { id: 'k1', nome: 'Conta principal', tipo: 'ordem', cor: '#000', arquivada: false, ordem: 0 },
  { id: 'k2', nome: 'Poupança; férias', tipo: 'poupanca', cor: '#000', arquivada: false, ordem: 1 },
];
const movs: Movimento[] = [
  { id: 'a', tipo: 'despesa', valorCent: 1250, categoriaId: 'c1', contaId: 'k1', data: '2026-11-08', nota: 'a;b "c"\nd', criadoEm: 1 },
  { id: 'b', tipo: 'receita', valorCent: 150000, categoriaId: 'c2', contaId: 'k1', data: '2026-11-01', nota: '', criadoEm: 2 },
  { id: 't', tipo: 'transferencia', valorCent: 20000, categoriaId: '', contaId: 'k1', contaDestinoId: 'k2', data: '2026-11-02', nota: '', criadoEm: 3 },
];
const acertos: Acerto[] = [{ id: 's', contaId: 'k2', data: '2026-10-31', saldoCent: -4550, criadoEm: 0 }];

const CAB = '﻿id;data;tipo;categoria;valor;nota;conta;contaDestino\r\n';

describe('gerarCsv', () => {
  it('BOM, cabeçalho com contas, ; \\r\\n, ordem por data', () => {
    const csv = gerarCsv(movs, cats, contas, acertos);
    expect(csv.startsWith(CAB)).toBe(true);
    const linhas = csv.slice(CAB.length).split('\r\n');
    expect(linhas[0]).toBe('s;31/10/2026;acerto;;-45,50;;"Poupança; férias";');
    expect(linhas[1]).toBe('b;01/11/2026;receita;Salário;1500,00;;Conta principal;');
    expect(linhas[2]).toBe('t;02/11/2026;transferencia;;200,00;;Conta principal;"Poupança; férias"');
    expect(csv).toContain('a;08/11/2026;despesa;Supermercado;12,50;"a;b ""c""\nd";Conta principal;\r\n');
  });
});

describe('lerCsv', () => {
  it('ida e volta preserva tudo, incluindo transferências e acertos negativos', () => {
    const r = lerCsv(gerarCsv(movs, cats, contas, acertos));
    if ('erro' in r) throw new Error('erro');
    expect(r.invalidas).toBe(0);
    expect(r.linhas).toEqual([
      { id: 's', data: '2026-10-31', tipo: 'acerto', categoria: '', valorCent: -4550, nota: '', conta: 'Poupança; férias', contaDestino: '' },
      { id: 'b', data: '2026-11-01', tipo: 'receita', categoria: 'Salário', valorCent: 150000, nota: '', conta: 'Conta principal', contaDestino: '' },
      { id: 't', data: '2026-11-02', tipo: 'transferencia', categoria: '', valorCent: 20000, nota: '', conta: 'Conta principal', contaDestino: 'Poupança; férias' },
      { id: 'a', data: '2026-11-08', tipo: 'despesa', categoria: 'Supermercado', valorCent: 1250, nota: 'a;b "c"\nd', conta: 'Conta principal', contaDestino: '' },
    ]);
  });

  it('lê o formato antigo de 6 colunas (sem contas)', () => {
    const r = lerCsv('id;data;tipo;categoria;valor;nota\n;03/11/2026;despesa;Café;1,20;\n');
    if ('erro' in r) throw new Error('erro');
    expect(r.linhas).toEqual([{ id: null, data: '2026-11-03', tipo: 'despesa', categoria: 'Café', valorCent: 120, nota: '', conta: '', contaDestino: '' }]);
  });

  it('conta linhas inválidas e ignora linhas vazias', () => {
    const r = lerCsv(
      'id;data;tipo;categoria;valor;nota;conta;contaDestino\r\n' +
        'x;03/11/2026;despesa;Café;abc;;A;\r\n' +
        'y;31/02/2026;despesa;Café;1;;A;\r\n' +
        'z;03/11/2026;outro;Café;1;;A;\r\n' +
        'w;03/11/2026;despesa;;1;;A;\r\n' +
        'v;03/11/2026;transferencia;;1;;A;\r\n' + // sem destino
        'u;03/11/2026;transferencia;;1;;A;A\r\n' + // origem = destino
        'q;03/11/2026;acerto;;10;;;\r\n' + // acerto sem conta
        'p;03/11/2026;despesa;Café;-3;;A;\r\n' + // despesa negativa
        '\r\n',
    );
    if ('erro' in r) throw new Error('erro');
    expect(r.linhas).toEqual([]);
    expect(r.invalidas).toBe(8);
  });

  it('cabeçalho diferente é erro', () => {
    expect(lerCsv('data,valor\n01/01/2026,3')).toEqual({ erro: 'cabecalho' });
    expect(lerCsv('')).toEqual({ erro: 'cabecalho' });
  });
});
