import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { gerarCsv } from '../dominio/csv';
import { apagarMovimento, db, garantirCategoriasIniciais, guardarMovimento, lerConfig, gravarConfig } from './db';
import { importarCsv } from './importar';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('base de dados', () => {
  it('cria as 9 categorias iniciais uma só vez', async () => {
    await garantirCategoriasIniciais();
    await garantirCategoriasIniciais();
    expect(await db.categorias.count()).toBe(9);
    expect(await db.categorias.where('tipo').equals('receita').count()).toBe(2);
  });

  it('guarda, edita e apaga movimentos', async () => {
    await garantirCategoriasIniciais();
    const cat = (await db.categorias.toArray())[0];
    const id = await guardarMovimento({ tipo: 'despesa', valorCent: 500, categoriaId: cat.id, data: '2026-11-08', nota: '' });
    await guardarMovimento({ id, tipo: 'despesa', valorCent: 700, categoriaId: cat.id, data: '2026-11-08', nota: 'x' });
    const m = await db.movimentos.get(id);
    expect(m).toMatchObject({ valorCent: 700, nota: 'x' });
    await apagarMovimento(id);
    expect(await db.movimentos.count()).toBe(0);
  });

  it('config chave/valor', async () => {
    expect(await lerConfig('x')).toBeUndefined();
    await gravarConfig('x', 42);
    expect(await lerConfig<number>('x')).toBe(42);
  });
});

describe('importarCsv', () => {
  it('importar duas vezes o mesmo ficheiro não duplica', async () => {
    await garantirCategoriasIniciais();
    const cat = (await db.categorias.toArray())[0];
    await guardarMovimento({ tipo: 'despesa', valorCent: 500, categoriaId: cat.id, data: '2026-11-08', nota: '' });
    const csv = gerarCsv(await db.movimentos.toArray(), await db.categorias.toArray());
    await db.movimentos.clear();

    expect(await importarCsv(csv)).toEqual({ importados: 1, existentes: 0, invalidos: 0 });
    expect(await importarCsv(csv)).toEqual({ importados: 0, existentes: 1, invalidos: 0 });
    expect(await db.movimentos.count()).toBe(1);
  });

  it('cria categoria desconhecida e dá id às linhas sem id', async () => {
    await garantirCategoriasIniciais();
    const r = await importarCsv('id;data;tipo;categoria;valor;nota\n;03/11/2026;despesa;Café;1,20;\nx;03/11/2026;despesa;Café;abc;\n');
    expect(r).toEqual({ importados: 1, existentes: 0, invalidos: 1 });
    const cafe = await db.categorias.where('nome').equals('Café').first();
    expect(cafe?.tipo).toBe('despesa');
    const m = (await db.movimentos.toArray())[0];
    expect(m.categoriaId).toBe(cafe!.id);
    expect(m.id).toBeTruthy();
  });

  it('cabeçalho errado não importa nada', async () => {
    expect(await importarCsv('a,b\n1,2')).toEqual({ erro: 'cabecalho' });
  });
});
