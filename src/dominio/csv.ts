import { isoParaPt, ptParaIso } from './datas';
import { centParaTexto, lerSaldo, lerValor } from './dinheiro';
import { NOTA_MAX, type Acerto, type Categoria, type Conta, type Movimento, type TipoMovimento } from './tipos';

const CABECALHO = ['id', 'data', 'tipo', 'categoria', 'valor', 'nota', 'conta', 'contaDestino'];
const CABECALHO_ANTIGO = CABECALHO.slice(0, 6);

/** Uma linha do CSV: um movimento, ou um acerto de saldo (valorCent = saldo, pode ser negativo). */
export type LinhaCsv = {
  id: string | null;
  data: string;
  tipo: TipoMovimento | 'acerto';
  categoria: string;
  valorCent: number;
  nota: string;
  conta: string; // '' no formato antigo
  contaDestino: string;
};

function campo(v: string): string {
  return /[;"\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function gerarCsv(movs: Movimento[], cats: Categoria[], contas: Conta[], acertos: Acerto[]): string {
  const nomeCat = new Map(cats.map((c) => [c.id, c.nome]));
  const nomeConta = new Map(contas.map((c) => [c.id, c.nome]));
  const conta = (id?: string) => (id ? nomeConta.get(id) ?? 'Sem conta' : '');
  type Item = { data: string; criadoEm: number; campos: string[] };
  const itens: Item[] = [
    ...acertos.map((a) => ({
      data: a.data,
      criadoEm: a.criadoEm,
      campos: [a.id, isoParaPt(a.data), 'acerto', '', centParaTexto(a.saldoCent), '', conta(a.contaId), ''],
    })),
    ...movs.map((m) => ({
      data: m.data,
      criadoEm: m.criadoEm,
      campos: [
        m.id,
        isoParaPt(m.data),
        m.tipo,
        m.tipo === 'transferencia' ? '' : nomeCat.get(m.categoriaId) ?? 'Sem categoria',
        centParaTexto(m.valorCent),
        m.nota,
        conta(m.contaId),
        m.tipo === 'transferencia' ? conta(m.contaDestinoId) : '',
      ],
    })),
  ];
  itens.sort((a, b) => (a.data === b.data ? a.criadoEm - b.criadoEm : a.data < b.data ? -1 : 1));
  const linhas = [CABECALHO.join(';'), ...itens.map((i) => i.campos.map(campo).join(';'))];
  return '﻿' + linhas.join('\r\n') + '\r\n';
}

/** Divide o texto em linhas de campos, respeitando aspas (com ; e quebras de linha lá dentro). */
function partir(texto: string): string[][] {
  const linhas: string[][] = [];
  let linha: string[] = [];
  let atual = '';
  let aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"') {
        if (texto[i + 1] === '"') { atual += '"'; i++; } else aspas = false;
      } else atual += c;
    } else if (c === '"') aspas = true;
    else if (c === ';') { linha.push(atual); atual = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      linha.push(atual); linhas.push(linha); linha = []; atual = '';
    } else atual += c;
  }
  if (atual !== '' || linha.length) { linha.push(atual); linhas.push(linha); }
  return linhas;
}

const TIPOS = new Set(['despesa', 'receita', 'transferencia', 'acerto']);

function lerLinha(l: string[], comContas: boolean): LinhaCsv | null {
  const [id = '', dataPt = '', tipoTxt = '', categoria = '', valor = '', nota = '', contaTxt = '', destinoTxt = ''] = l;
  const data = ptParaIso(dataPt);
  const tipo = tipoTxt.trim().toLowerCase();
  if (!data || !TIPOS.has(tipo)) return null;
  const conta = comContas ? contaTxt.trim() : '';
  const contaDestino = comContas ? destinoTxt.trim() : '';
  const cat = categoria.trim();
  const valorCent = tipo === 'acerto' ? lerSaldo(valor) : lerValor(valor);
  if (valorCent === null) return null;
  if ((tipo === 'despesa' || tipo === 'receita') && !cat) return null;
  if (tipo === 'transferencia' && (!conta || !contaDestino || conta === contaDestino)) return null;
  if (tipo === 'acerto' && !conta) return null;
  return {
    id: id.trim() || null,
    data,
    tipo: tipo as LinhaCsv['tipo'],
    categoria: tipo === 'transferencia' || tipo === 'acerto' ? '' : cat,
    valorCent,
    nota: nota.slice(0, NOTA_MAX),
    conta,
    contaDestino: tipo === 'transferencia' ? contaDestino : '',
  };
}

export function lerCsv(texto: string): { linhas: LinhaCsv[]; invalidas: number } | { erro: 'cabecalho' } {
  const todas = partir(texto.replace(/^﻿/, ''));
  const cab = todas[0]?.map((x) => x.trim().toLowerCase());
  if (!cab || cab.length < CABECALHO_ANTIGO.length || CABECALHO_ANTIGO.some((h, i) => cab[i] !== h)) return { erro: 'cabecalho' };
  const comContas = cab[6] === 'conta' && cab[7] === 'contadestino';
  const linhas: LinhaCsv[] = [];
  let invalidas = 0;
  for (const l of todas.slice(1)) {
    if (l.every((x) => x.trim() === '')) continue;
    const linha = lerLinha(l, comContas);
    if (linha) linhas.push(linha);
    else invalidas++;
  }
  return { linhas, invalidas };
}
