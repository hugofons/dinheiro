import { lerCsv } from '../dominio/csv';
import { PALETA, type Acerto, type Categoria, type Conta, type Movimento } from '../dominio/tipos';
import { contaPorDefeito, db, novoId } from './db';

export type ResultadoImportar = { importados: number; existentes: number; invalidos: number } | { erro: 'cabecalho' };

export async function importarCsv(texto: string): Promise<ResultadoImportar> {
  const r = lerCsv(texto);
  if ('erro' in r) return r;
  const contaDefeito = r.linhas.some((l) => !l.conta) ? await contaPorDefeito() : '';

  return db.transaction('rw', [db.categorias, db.movimentos, db.contas, db.acertos], async () => {
    const cats = await db.categorias.toArray();
    const chaveCat = (nome: string, tipo: string) => `${tipo}|${nome.toLowerCase()}`;
    const catPorNome = new Map(cats.map((c) => [chaveCat(c.nome, c.tipo), c.id]));
    let ordemCat = cats.length;
    const novasCats: Categoria[] = [];

    const contas = await db.contas.toArray();
    const contaPorNome = new Map(contas.map((c) => [c.nome.toLowerCase(), c.id]));
    let ordemConta = contas.length;
    const novasContas: Conta[] = [];
    const conta = (nome: string) => {
      if (!nome) return contaDefeito;
      let id = contaPorNome.get(nome.toLowerCase());
      if (!id) {
        id = novoId();
        novasContas.push({ id, nome, tipo: 'ordem', cor: PALETA[ordemConta % PALETA.length], arquivada: false, ordem: ordemConta++ });
        contaPorNome.set(nome.toLowerCase(), id);
      }
      return id;
    };

    const ids = r.linhas.map((l) => l.id).filter((x): x is string => !!x);
    const jaExistem = new Set([
      ...(await db.movimentos.bulkGet(ids)).filter(Boolean).map((m) => m!.id),
      ...(await db.acertos.bulkGet(ids)).filter(Boolean).map((a) => a!.id),
    ]);

    const novos: Movimento[] = [];
    const novosAcertos: Acerto[] = [];
    const vistos = new Set<string>();
    let existentes = 0;
    const agora = Date.now();
    r.linhas.forEach((l, i) => {
      if (l.id && (jaExistem.has(l.id) || vistos.has(l.id))) { existentes++; return; }
      const id = l.id ?? novoId();
      vistos.add(id);
      const criadoEm = agora + i;
      if (l.tipo === 'acerto') {
        novosAcertos.push({ id, contaId: conta(l.conta), data: l.data, saldoCent: l.valorCent, criadoEm });
        return;
      }
      if (l.tipo === 'transferencia') {
        novos.push({ id, tipo: l.tipo, valorCent: l.valorCent, categoriaId: '', contaId: conta(l.conta), contaDestinoId: conta(l.contaDestino), data: l.data, nota: l.nota, criadoEm });
        return;
      }
      let catId = catPorNome.get(chaveCat(l.categoria, l.tipo));
      if (!catId) {
        catId = novoId();
        novasCats.push({ id: catId, nome: l.categoria, tipo: l.tipo, cor: PALETA[ordemCat % PALETA.length], escondida: false, ordem: ordemCat++ });
        catPorNome.set(chaveCat(l.categoria, l.tipo), catId);
      }
      novos.push({ id, tipo: l.tipo, valorCent: l.valorCent, categoriaId: catId, contaId: conta(l.conta), data: l.data, nota: l.nota, criadoEm });
    });

    await db.categorias.bulkAdd(novasCats);
    await db.contas.bulkAdd(novasContas);
    await db.movimentos.bulkAdd(novos);
    await db.acertos.bulkAdd(novosAcertos);
    return { importados: novos.length + novosAcertos.length, existentes, invalidos: r.invalidas };
  });
}
