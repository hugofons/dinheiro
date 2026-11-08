import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'preact/hooks';
import { Icone } from './componentes/Icone';
import { db } from './dados/db';
import { chaveMes, mesAtual, mesDe, type Mes } from './dominio/datas';
import type { Movimento } from './dominio/tipos';
import { Contas } from './ecras/Contas';
import { Definicoes } from './ecras/Definicoes';
import { Evolucao } from './ecras/Evolucao';
import { FormMovimento } from './ecras/FormMovimento';
import { MesEcra } from './ecras/Mes';

type Separador = 'mes' | 'contas' | 'evolucao' | 'definicoes';

const SEPARADORES = [
  ['mes', 'Mês', 'calendario'],
  ['contas', 'Contas', 'carteira'],
  ['evolucao', 'Evolução', 'grafico'],
  ['definicoes', 'Definições', 'definicoes'],
] as const;

// Pré-visualização: ?ecra=contas|evolucao|definicoes|novo abre diretamente esse ecrã.
const ecraPedido = new URLSearchParams(location.search).get('ecra');

export function App() {
  const [sep, setSep] = useState<Separador>(SEPARADORES.some(([id]) => id === ecraPedido) ? (ecraPedido as Separador) : 'mes');
  const [mes, setMes] = useState<Mes>(mesAtual());
  const [form, setForm] = useState<{ movimento?: Movimento } | null>(ecraPedido === 'novo' ? {} : null);

  const movimentos = useLiveQuery(() => db.movimentos.toArray(), [], undefined);
  const categorias = useLiveQuery(() => db.categorias.toArray().then((cs) => cs.sort((a, b) => a.ordem - b.ordem)), [], undefined);
  const contas = useLiveQuery(() => db.contas.orderBy('ordem').toArray(), [], undefined);
  const acertos = useLiveQuery(() => db.acertos.toArray(), [], undefined);

  if (!movimentos || !categorias || !contas || !acertos) return <div class="a-carregar" />;

  const fecharForm = (dataGuardada?: string) => {
    setForm(null);
    if (dataGuardada) setMes(mesDe(dataGuardada));
  };

  const indice = SEPARADORES.findIndex(([id]) => id === sep);
  const dados = { movimentos, categorias, contas, acertos };

  return (
    <div class="app">
      <div class="fundo-vivo" aria-hidden="true">
        <div class="camada">
          <span class="bolha b1" />
          <span class="bolha b2" />
          <span class="bolha b3" />
          <span class="bolha b4" />
        </div>
        <span class="luz-dedo" />
      </div>

      <main class="conteudo" key={sep === 'mes' ? `mes-${chaveMes(mes)}` : sep}>
        {sep === 'mes' && (
          <MesEcra mes={mes} setMes={setMes} {...dados}
            abrir={(m) => setForm({ movimento: m })} irDefinicoes={() => setSep('definicoes')} />
        )}
        {sep === 'contas' && <Contas {...dados} />}
        {sep === 'evolucao' && <Evolucao {...dados} />}
        {sep === 'definicoes' && <Definicoes {...dados} />}
      </main>

      {(sep === 'mes' || sep === 'evolucao') && (
        <button class={`fab ${form ? 'aberto' : ''}`} aria-label="Novo movimento" onClick={() => setForm({})}>
          <Icone nome="mais" />
        </button>
      )}

      <nav class="barra" style={{ '--n': SEPARADORES.length }}>
        <span class="indicador" style={{ '--i': indice }} aria-hidden="true" />
        {SEPARADORES.map(([id, nome, icone]) => (
          <button key={id} class={sep === id ? 'ativo' : ''} aria-current={sep === id ? 'page' : undefined} onClick={() => setSep(id)}>
            <Icone nome={icone} />
            <span>{nome}</span>
          </button>
        ))}
      </nav>

      {form && <FormMovimento movimento={form.movimento} categorias={categorias} contas={contas} fechar={fecharForm} />}
    </div>
  );
}
