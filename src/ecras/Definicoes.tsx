import { useLiveQuery } from 'dexie-react-hooks';
import { useRef, useState } from 'preact/hooks';
import { gravarConfig, guardarCategoria, lerConfig } from '../dados/db';
import { importarCsv } from '../dados/importar';
import { gerarCsv } from '../dominio/csv';
import { hojeISO, isoParaPt } from '../dominio/datas';
import { PALETA, type Categoria, type Tipo } from '../dominio/tipos';

type Props = { movimentos: import('../dominio/tipos').Movimento[]; categorias: Categoria[] };

type Edicao = { id?: string; nome: string; tipo: Tipo; cor: string; escondida: boolean };

export function Definicoes({ movimentos, categorias }: Props) {
  const ultima = useLiveQuery(() => lerConfig<number>('ultimaExportacao'), [], undefined);
  const [edicao, setEdicao] = useState<Edicao | null>(null);
  const [erroNome, setErroNome] = useState('');
  const [mensagem, setMensagem] = useState<{ texto: string; erro?: boolean } | null>(null);
  const ficheiro = useRef<HTMLInputElement>(null);

  async function exportar() {
    const blob = new Blob([gerarCsv(movimentos, categorias)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dinheiro-${hojeISO()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    await gravarConfig('ultimaExportacao', Date.now());
    setMensagem({ texto: `Exportados ${movimentos.length} movimentos.` });
  }

  async function importar(f: File) {
    try {
      const r = await importarCsv(await f.text());
      if ('erro' in r) setMensagem({ texto: 'Este ficheiro não parece ser uma exportação da app.', erro: true });
      else setMensagem({ texto: `${r.importados} importados, ${r.existentes} já existiam, ${r.invalidos} inválidos.` });
    } catch {
      setMensagem({ texto: 'Não foi possível importar. Tenta outra vez.', erro: true });
    }
    if (ficheiro.current) ficheiro.current.value = '';
  }

  async function guardarEdicao(e: Event) {
    e.preventDefault();
    if (!edicao) return;
    const nome = edicao.nome.trim();
    if (!nome) { setErroNome('Escreve um nome'); return; }
    if (categorias.some((c) => c.id !== edicao.id && c.tipo === edicao.tipo && c.nome.toLowerCase() === nome.toLowerCase())) {
      setErroNome('Já existe uma categoria com este nome');
      return;
    }
    await guardarCategoria({ ...edicao, nome });
    setEdicao(null);
  }

  const abrirEdicao = (e: Edicao) => { setErroNome(''); setEdicao(e); };

  return (
    <>
      <header class="cabecalho-simples"><h1>Definições</h1></header>

      {(['despesa', 'receita'] as const).map((tipo) => (
        <section class="cartao" key={tipo}>
          <div class="cartao-topo">
            <h2>{tipo === 'despesa' ? 'Categorias de despesa' : 'Categorias de receita'}</h2>
            <button class="btn-texto" onClick={() => abrirEdicao({ nome: '', tipo, cor: PALETA[categorias.length % PALETA.length], escondida: false })}>+ Nova</button>
          </div>
          <ul class="lista-cats">
            {categorias.filter((c) => c.tipo === tipo).map((c) => (
              <li key={c.id} class={c.escondida ? 'escondida' : ''}>
                <button class="linha-cat-btn" onClick={() => abrirEdicao({ id: c.id, nome: c.nome, tipo: c.tipo, cor: c.cor, escondida: c.escondida })}>
                  <span class="bolinha" style={{ background: c.cor }} />
                  <span>{c.nome}</span>
                  {c.escondida && <small>escondida</small>}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section class="cartao">
        <h2>Cópia de segurança</h2>
        <p class="nota">Os teus dados ficam só neste telemóvel. Exporta uma cópia de vez em quando e guarda-a noutro sítio (Google Drive, email…).</p>
        <p class="nota">Última exportação: <strong>{ultima ? isoParaPt(hojeISO(new Date(ultima))) : 'nunca'}</strong></p>
        <div class="acoes">
          <button class="btn-secundario" onClick={() => ficheiro.current?.click()}>Importar CSV</button>
          <button class="btn-principal" onClick={exportar}>Exportar CSV</button>
        </div>
        <input ref={ficheiro} type="file" accept=".csv,text/csv" hidden onChange={(e) => e.currentTarget.files?.[0] && importar(e.currentTarget.files[0])} />
        {mensagem && <p class={mensagem.erro ? 'erro' : 'sucesso'} role="status">{mensagem.texto}</p>}
      </section>

      <p class="versao">Dinheiro · versão {__VERSAO__}</p>

      {edicao && (
        <div class="folha-fundo" onClick={(e) => e.target === e.currentTarget && setEdicao(null)}>
          <form class="folha" onSubmit={guardarEdicao} noValidate>
            <header class="folha-cabecalho">
              <h2>{edicao.id ? 'Editar categoria' : 'Nova categoria'}</h2>
            </header>
            <label class="campo">
              <span>Nome</span>
              <input value={edicao.nome} maxLength={30} autoFocus onInput={(e) => setEdicao({ ...edicao, nome: e.currentTarget.value })} />
              {erroNome && <small class="erro">{erroNome}</small>}
            </label>
            <fieldset class="campo">
              <legend>Cor</legend>
              <div class="paleta">
                {PALETA.map((p) => (
                  <button key={p} type="button" class={`cor ${edicao.cor === p ? 'ativo' : ''}`} style={{ background: p }}
                    aria-label={`Cor ${p}`} aria-pressed={edicao.cor === p} onClick={() => setEdicao({ ...edicao, cor: p })} />
                ))}
              </div>
            </fieldset>
            {edicao.id && (
              <label class="interruptor">
                <input type="checkbox" checked={edicao.escondida} onChange={(e) => setEdicao({ ...edicao, escondida: e.currentTarget.checked })} />
                <span>Esconder (deixa de aparecer ao registar; os movimentos antigos mantêm-se)</span>
              </label>
            )}
            <div class="acoes">
              <button type="button" class="btn-secundario" onClick={() => setEdicao(null)}>Cancelar</button>
              <button type="submit" class="btn-principal">Guardar</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
