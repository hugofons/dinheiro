import { lerCsv } from '../dominio/csv';
import { PALETA, type Categoria, type Movimento } from '../dominio/tipos';
import { db, novoId } from './db';

export type ResultadoImportar = { importados: number; existentes: number; invalidos: number } | { erro: 'cabecalho' };

export async function importarCsv(texto: string): Promise<ResultadoImportar> {
  const r = lerCsv(texto);
  if ('erro' in r) return r;

  return db.transaction('rw', db.categorias, db.movimentos, async () => {
    const cats = await db.categorias.toArray();
    const chave = (nome: string, tipo: string) => `${tipo}|${nome.toLowerCase()}`;
    const porNome = new Map(cats.map((c) => [chave(c.nome, c.tipo), c.id]));
    let ordem = cats.length;
    const novasCats: Categoria[] = [];

    const ids = r.linhas.map((l) => l.id).filter((x): x is string => !!x);
    const jaExistem = new Set((await db.movimentos.bulkGet(ids)).filter(Boolean).map((m) => m!.id));

    const novos: Movimento[] = [];
    let existentes = 0;
    const agora = Date.now();
    r.linhas.forEach((l, i) => {
      if (l.id && (jaExistem.has(l.id) || novos.some((n) => n.id === l.id))) { existentes++; return; }
      let catId = porNome.get(chave(l.categoria, l.tipo));
      if (!catId) {
        catId = novoId();
        novasCats.push({ id: catId, nome: l.categoria, tipo: l.tipo, cor: PALETA[ordem % PALETA.length], escondida: false, ordem: ordem++ });
        porNome.set(chave(l.categoria, l.tipo), catId);
      }
      novos.push({ id: l.id ?? novoId(), tipo: l.tipo, valorCent: l.valorCent, categoriaId: catId, data: l.data, nota: l.nota, criadoEm: agora + i });
    });

    await db.categorias.bulkAdd(novasCats);
    await db.movimentos.bulkAdd(novos);
    return { importados: novos.length, existentes, invalidos: r.invalidas };
  });
}
