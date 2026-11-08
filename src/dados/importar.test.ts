import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { beforeEach, describe, expect, it } from 'vitest';
import { saldoConta } from '../dominio/contas';
import { gerarCsv } from '../dominio/csv';
import {
  apagarMovimento,
  atualizarSaldos,
  db,
  garantirDadosIniciais,
  gravarConfig,
  guardarConta,
  guardarMovimento,
  lerConfig,
} from './db';
import { importarCsv } from './importar';

beforeEach(async () => {
  db.close();
  await Dexie.delete('dinheiro');
  await db.open();
});

const contaPrincipal = async () => (await db.contas.toArray())[0];

describe('dados iniciais', () => {
  it('cria 9 categorias e a Conta principal uma só vez', async () => {
    await garantirDadosIniciais();
    await garantirDadosIniciais();
    expect(await db.categorias.count()).toBe(9);
    expect(await db.categorias.where('tipo').equals('receita').count()).toBe(2);
    const contas = await db.contas.toArray();
    expect(contas.map((c) => [c.nome, c.tipo])).toEqual([['Conta principal', 'ordem']]);
  });
});

describe('migração da versão 2', () => {
  it('cria a Conta principal e passa para lá os movimentos antigos', async () => {
    db.close();
    await Dexie.delete('dinheiro');
    const velho = new Dexie('dinheiro');
    velho.version(2).stores({ categorias: 'id, tipo, nome', movimentos: 'id, data, categoriaId', config: 'chave' });
    await velho.open();
    await velho.table('movimentos').add({ id: 'm1', tipo: 'despesa', valorCent: 500, categoriaId: 'c', data: '2026-11-01', nota: '', criadoEm: 1 });
    await velho.table('config').put({ chave: 'categoriasIniciais', valor: true });
    velho.close();

    await db.open();
    await garantirDadosIniciais();
    const contas = await db.contas.toArray();
    expect(contas).toHaveLength(1);
    expect((await db.movimentos.get('m1'))?.contaId).toBe(contas[0].id);
  });
});

describe('movimentos e contas', () => {
  it('guarda, edita e apaga; lembra a última conta', async () => {
    await garantirDadosIniciais();
    const cat = (await db.categorias.toArray())[0];
    const conta = await contaPrincipal();
    const id = await guardarMovimento({ tipo: 'despesa', valorCent: 500, categoriaId: cat.id, contaId: conta.id, data: '2026-11-08', nota: '' });
    await guardarMovimento({ id, tipo: 'despesa', valorCent: 700, categoriaId: cat.id, contaId: conta.id, data: '2026-11-08', nota: 'x' });
    expect(await db.movimentos.get(id)).toMatchObject({ valorCent: 700, nota: 'x' });
    expect(await lerConfig('ultimaConta')).toBe(conta.id);
    await apagarMovimento(id);
    expect(await db.movimentos.count()).toBe(0);
  });

  it('config chave/valor', async () => {
    expect(await lerConfig('x')).toBeUndefined();
    await gravarConfig('x', 42);
    expect(await lerConfig<number>('x')).toBe(42);
  });

  it('atualizarSaldos só cria acertos nas contas que mudaram e devolve a diferença', async () => {
    await garantirDadosIniciais();
    const a = await contaPrincipal();
    const b = await guardarConta({ nome: 'Poupança', tipo: 'poupanca', cor: '#fff', arquivada: false });
    await guardarMovimento({ tipo: 'receita', valorCent: 10000, categoriaId: 'c', contaId: a.id, data: '2026-11-01', nota: '' });

    const r = await atualizarSaldos([{ contaId: a.id, saldoCent: 9500 }, { contaId: b, saldoCent: 0 }], '2026-11-08');
    expect(r).toEqual([{ contaId: a.id, diferenca: -500 }]);
    expect(await db.acertos.count()).toBe(1);

    const movs = await db.movimentos.toArray();
    const acertos = await db.acertos.toArray();
    expect(saldoConta(a.id, movs, acertos)).toBe(9500);
  });
});

describe('importarCsv', () => {
  it('importar duas vezes a mesma cópia não duplica movimentos nem acertos', async () => {
    await garantirDadosIniciais();
    const cat = (await db.categorias.toArray())[0];
    const a = await contaPrincipal();
    const b = await guardarConta({ nome: 'Poupança', tipo: 'poupanca', cor: '#fff', arquivada: false });
    await guardarMovimento({ tipo: 'despesa', valorCent: 500, categoriaId: cat.id, contaId: a.id, data: '2026-11-08', nota: '' });
    await guardarMovimento({ tipo: 'transferencia', valorCent: 2000, categoriaId: '', contaId: a.id, contaDestinoId: b, data: '2026-11-08', nota: '' });
    await atualizarSaldos([{ contaId: b, saldoCent: 70000 }], '2026-11-08');
    const csv = gerarCsv(await db.movimentos.toArray(), await db.categorias.toArray(), await db.contas.toArray(), await db.acertos.toArray());
    await db.movimentos.clear();
    await db.acertos.clear();

    expect(await importarCsv(csv)).toEqual({ importados: 3, existentes: 0, invalidos: 0 });
    expect(await importarCsv(csv)).toEqual({ importados: 0, existentes: 3, invalidos: 0 });
    expect(await db.movimentos.count()).toBe(2);
    expect(await db.acertos.count()).toBe(1);
    const t = (await db.movimentos.toArray()).find((m) => m.tipo === 'transferencia');
    expect(t).toMatchObject({ contaId: a.id, contaDestinoId: b });
  });

  it('cria categorias e contas desconhecidas; formato antigo vai para a Conta principal', async () => {
    await garantirDadosIniciais();
    const r = await importarCsv('id;data;tipo;categoria;valor;nota\n;03/11/2026;despesa;Café;1,20;\nx;03/11/2026;despesa;Café;abc;\n');
    expect(r).toEqual({ importados: 1, existentes: 0, invalidos: 1 });
    const cafe = await db.categorias.where('nome').equals('Café').first();
    expect(cafe?.tipo).toBe('despesa');
    const m = (await db.movimentos.toArray())[0];
    expect(m.categoriaId).toBe(cafe!.id);
    expect(m.contaId).toBe((await contaPrincipal()).id);

    await importarCsv('id;data;tipo;categoria;valor;nota;conta;contaDestino\nz;04/11/2026;acerto;;-30,00;;Cartão;\n');
    const cartao = (await db.contas.toArray()).find((c) => c.nome === 'Cartão');
    expect(cartao).toBeTruthy();
    expect((await db.acertos.toArray())[0]).toMatchObject({ id: 'z', contaId: cartao!.id, saldoCent: -3000 });
  });

  it('cabeçalho errado não importa nada', async () => {
    expect(await importarCsv('a,b\n1,2')).toEqual({ erro: 'cabecalho' });
  });
});
