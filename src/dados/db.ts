import Dexie, { type EntityTable, type Transaction } from 'dexie';
import { saldoConta } from '../dominio/contas';
import { hojeISO } from '../dominio/datas';
import { migrarCor, NOTA_MAX, PALETA, type Acerto, type Categoria, type Conta, type Movimento, type Tipo } from '../dominio/tipos';

type Config = { chave: string; valor: unknown };

export const db = new Dexie('dinheiro') as Dexie & {
  categorias: EntityTable<Categoria, 'id'>;
  movimentos: EntityTable<Movimento, 'id'>;
  config: EntityTable<Config, 'chave'>;
  contas: EntityTable<Conta, 'id'>;
  acertos: EntityTable<Acerto, 'id'>;
};

db.version(1).stores({
  categorias: 'id, tipo, nome',
  movimentos: 'id, data, categoriaId',
  config: 'chave',
});

// v2: paleta de joias (tema Rubi) — troca as cores antigas pelas novas.
db.version(2).upgrade((tx) =>
  tx.table('categorias').toCollection().modify((c: Categoria) => {
    c.cor = migrarCor(c.cor);
  }),
);

// v3: contas e acertos de saldo. Os movimentos que já existiam passam para a "Conta principal".
db.version(3)
  .stores({
    movimentos: 'id, data, categoriaId, contaId',
    contas: 'id, ordem',
    acertos: 'id, contaId, data',
  })
  .upgrade(async (tx) => {
    const id = await criarContaPrincipal(tx);
    await tx.table('movimentos').toCollection().modify((m: Movimento) => {
      if (!m.contaId) m.contaId = id;
    });
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

async function criarContaPrincipal(tx: Transaction): Promise<string> {
  const id = novoId();
  await tx.table('contas').add({ id, nome: 'Conta principal', tipo: 'ordem', cor: PALETA[3], arquivada: false, ordem: 0 } satisfies Conta);
  await tx.table('config').put({ chave: 'contaInicial', valor: true });
  return id;
}

export async function garantirDadosIniciais(): Promise<void> {
  await db.transaction('rw', db.categorias, db.contas, db.config, async (tx) => {
    if (!(await lerConfig('categoriasIniciais'))) {
      await db.categorias.bulkAdd(INICIAIS.map(([nome, tipo, cor], ordem) => ({ id: novoId(), nome, tipo, cor, escondida: false, ordem })));
      await gravarConfig('categoriasIniciais', true);
    }
    if (!(await lerConfig('contaInicial')) && (await db.contas.count()) === 0) await criarContaPrincipal(tx);
  });
}

/** Conta usada quando não se sabe outra: a primeira não arquivada (cria uma se não houver nenhuma). */
export async function contaPorDefeito(): Promise<string> {
  const contas = (await db.contas.orderBy('ordem').toArray()).filter((c) => !c.arquivada);
  if (contas[0]) return contas[0].id;
  return guardarConta({ nome: 'Conta principal', tipo: 'ordem', cor: PALETA[3], arquivada: false });
}

export type NovoMovimento = Omit<Movimento, 'id' | 'criadoEm'> & { id?: string };

export async function guardarMovimento(m: NovoMovimento): Promise<string> {
  const anterior = m.id ? await db.movimentos.get(m.id) : undefined;
  const id = m.id ?? novoId();
  const mov: Movimento = { ...m, id, nota: m.nota.trim().slice(0, NOTA_MAX), criadoEm: anterior?.criadoEm ?? Date.now() };
  if (mov.tipo !== 'transferencia') delete mov.contaDestinoId;
  else mov.categoriaId = '';
  await db.movimentos.put(mov);
  if (m.tipo !== 'transferencia') await gravarConfig(`ultimaCategoria:${m.tipo}`, m.categoriaId);
  await gravarConfig('ultimaConta', m.contaId);
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

export async function guardarConta(c: Omit<Conta, 'id' | 'ordem'> & { id?: string }): Promise<string> {
  if (c.id) {
    await db.contas.update(c.id, { nome: c.nome.trim(), tipo: c.tipo, cor: c.cor, arquivada: c.arquivada });
    return c.id;
  }
  const id = novoId();
  const ordem = await db.contas.count();
  await db.contas.add({ ...c, nome: c.nome.trim(), id, ordem });
  return id;
}

/**
 * Regista os saldos reais das contas. Só cria acerto nas contas cujo saldo calculado é diferente.
 * Devolve, por conta alterada, a diferença (real − calculado): o que ficou por registar.
 */
export async function atualizarSaldos(novos: { contaId: string; saldoCent: number }[], data = hojeISO()): Promise<{ contaId: string; diferenca: number }[]> {
  return db.transaction('rw', db.movimentos, db.acertos, async () => {
    const movs = await db.movimentos.toArray();
    const acertos = await db.acertos.toArray();
    const agora = Date.now();
    const alteradas: { contaId: string; diferenca: number }[] = [];
    for (const [i, n] of novos.entries()) {
      const atual = saldoConta(n.contaId, movs, acertos);
      if (atual === n.saldoCent) continue;
      await db.acertos.add({ id: novoId(), contaId: n.contaId, data, saldoCent: n.saldoCent, criadoEm: agora + i });
      alteradas.push({ contaId: n.contaId, diferenca: n.saldoCent - atual });
    }
    return alteradas;
  });
}

export async function lerConfig<T = unknown>(chave: string): Promise<T | undefined> {
  return (await db.config.get(chave))?.valor as T | undefined;
}

export async function gravarConfig(chave: string, valor: unknown): Promise<void> {
  await db.config.put({ chave, valor });
}
