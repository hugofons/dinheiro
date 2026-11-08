import Dexie, { type EntityTable } from 'dexie';
import { NOTA_MAX, PALETA, type Categoria, type Movimento, type Tipo } from '../dominio/tipos';

type Config = { chave: string; valor: unknown };

export const db = new Dexie('dinheiro') as Dexie & {
  categorias: EntityTable<Categoria, 'id'>;
  movimentos: EntityTable<Movimento, 'id'>;
  config: EntityTable<Config, 'chave'>;
};

db.version(1).stores({
  categorias: 'id, tipo, nome',
  movimentos: 'id, data, categoriaId',
  config: 'chave',
});

export const novoId = () => crypto.randomUUID();

const INICIAIS: [string, Tipo, string][] = [
  ['Supermercado', 'despesa', PALETA[0]],
  ['Casa', 'despesa', PALETA[1]],
  ['Transportes', 'despesa', PALETA[2]],
  ['Restaurantes', 'despesa', PALETA[3]],
  ['Saúde', 'despesa', PALETA[4]],
  ['Lazer', 'despesa', PALETA[5]],
  ['Outros', 'despesa', PALETA[9]],
  ['Salário', 'receita', PALETA[7]],
  ['Outras receitas', 'receita', PALETA[8]],
];

export async function garantirCategoriasIniciais(): Promise<void> {
  await db.transaction('rw', db.categorias, db.config, async () => {
    if (await lerConfig('categoriasIniciais')) return;
    await db.categorias.bulkAdd(INICIAIS.map(([nome, tipo, cor], ordem) => ({ id: novoId(), nome, tipo, cor, escondida: false, ordem })));
    await gravarConfig('categoriasIniciais', true);
  });
}

export type NovoMovimento = Omit<Movimento, 'id' | 'criadoEm'> & { id?: string };

export async function guardarMovimento(m: NovoMovimento): Promise<string> {
  const anterior = m.id ? await db.movimentos.get(m.id) : undefined;
  const id = m.id ?? novoId();
  await db.movimentos.put({ ...m, id, nota: m.nota.trim().slice(0, NOTA_MAX), criadoEm: anterior?.criadoEm ?? Date.now() });
  await gravarConfig(`ultimaCategoria:${m.tipo}`, m.categoriaId);
  return id;
}

export async function apagarMovimento(id: string): Promise<void> {
  await db.movimentos.delete(id);
}

export async function guardarCategoria(c: Omit<Categoria, 'id' | 'ordem'> & { id?: string }): Promise<string> {
  if (c.id) {
    await db.categorias.update(c.id, { nome: c.nome.trim(), cor: c.cor, escondida: c.escondida });
    return c.id;
  }
  const id = novoId();
  const ordem = await db.categorias.count();
  await db.categorias.add({ ...c, nome: c.nome.trim(), id, ordem });
  return id;
}

export async function lerConfig<T = unknown>(chave: string): Promise<T | undefined> {
  return (await db.config.get(chave))?.valor as T | undefined;
}

export async function gravarConfig(chave: string, valor: unknown): Promise<void> {
  await db.config.put({ chave, valor });
}
