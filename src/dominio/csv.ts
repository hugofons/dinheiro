import { isoParaPt, ptParaIso } from './datas';
import { centParaTexto, lerValor } from './dinheiro';
import { NOTA_MAX, type Categoria, type Movimento, type Tipo } from './tipos';

const CABECALHO = ['id', 'data', 'tipo', 'categoria', 'valor', 'nota'];

export type LinhaCsv = { id: string | null; data: string; tipo: Tipo; categoria: string; valorCent: number; nota: string };

function campo(v: string): string {
  return /[;"\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function gerarCsv(movs: Movimento[], cats: Categoria[]): string {
  const nomes = new Map(cats.map((c) => [c.id, c.nome]));
  const ordenados = [...movs].sort((a, b) => (a.data === b.data ? a.criadoEm - b.criadoEm : a.data < b.data ? -1 : 1));
  const linhas = [CABECALHO.join(';')];
  for (const m of ordenados) {
    linhas.push(
      [m.id, isoParaPt(m.data), m.tipo, nomes.get(m.categoriaId) ?? 'Sem categoria', centParaTexto(m.valorCent), m.nota].map(campo).join(';'),
    );
  }
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

export function lerCsv(texto: string): { linhas: LinhaCsv[]; invalidas: number } | { erro: 'cabecalho' } {
  const todas = partir(texto.replace(/^﻿/, ''));
  const cab = todas[0]?.map((x) => x.trim().toLowerCase());
  if (!cab || cab.length < CABECALHO.length || CABECALHO.some((h, i) => cab[i] !== h)) return { erro: 'cabecalho' };
  const linhas: LinhaCsv[] = [];
  let invalidas = 0;
  for (const l of todas.slice(1)) {
    if (l.every((x) => x.trim() === '')) continue;
    const [id, dataPt, tipo, categoria, valor, nota = ''] = l.map((x) => x ?? '');
    const data = ptParaIso(dataPt ?? '');
    const valorCent = lerValor(valor ?? '');
    const t = (tipo ?? '').trim().toLowerCase();
    const cat = (categoria ?? '').trim();
    if (!data || valorCent === null || (t !== 'despesa' && t !== 'receita') || !cat) { invalidas++; continue; }
    linhas.push({ id: id?.trim() || null, data, tipo: t, categoria: cat, valorCent, nota: nota.slice(0, NOTA_MAX) });
  }
  return { linhas, invalidas };
}
