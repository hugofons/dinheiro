import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'preact/hooks';
import { Icone } from './componentes/Icone';
import { db } from './dados/db';
import { mesAtual, mesDe, type Mes } from './dominio/datas';
import type { Movimento } from './dominio/tipos';
import { Definicoes } from './ecras/Definicoes';
import { Evolucao } from './ecras/Evolucao';
import { FormMovimento } from './ecras/FormMovimento';
import { MesEcra } from './ecras/Mes';

type Separador = 'mes' | 'evolucao' | 'definicoes';

export function App() {
  const [sep, setSep] = useState<Separador>('mes');
  const [mes, setMes] = useState<Mes>(mesAtual());
  const [form, setForm] = useState<{ movimento?: Movimento } | null>(null);

  const movimentos = useLiveQuery(() => db.movimentos.toArray(), [], undefined);
  const categorias = useLiveQuery(() => db.categorias.orderBy('nome').toArray().then((cs) => cs.sort((a, b) => a.ordem - b.ordem)), [], undefined);

  if (!movimentos || !categorias) return <div class="a-carregar" />;

  const fecharForm = (dataGuardada?: string) => {
    setForm(null);
    if (dataGuardada) setMes(mesDe(dataGuardada));
  };

  return (
    <div class="app">
      <main class="conteudo">
        {sep === 'mes' && (
          <MesEcra mes={mes} setMes={setMes} movimentos={movimentos} categorias={categorias}
            abrir={(m) => setForm({ movimento: m })} irDefinicoes={() => setSep('definicoes')} />
        )}
        {sep === 'evolucao' && <Evolucao movimentos={movimentos} categorias={categorias} />}
        {sep === 'definicoes' && <Definicoes movimentos={movimentos} categorias={categorias} />}
      </main>

      {sep !== 'definicoes' && (
        <button class="fab" aria-label="Novo movimento" onClick={() => setForm({})}>
          <Icone nome="mais" />
        </button>
      )}

      <nav class="barra">
        {([['mes', 'Mês', 'calendario'], ['evolucao', 'Evolução', 'grafico'], ['definicoes', 'Definições', 'definicoes']] as const).map(([id, nome, icone]) => (
          <button key={id} class={sep === id ? 'ativo' : ''} aria-current={sep === id ? 'page' : undefined} onClick={() => setSep(id)}>
            <Icone nome={icone} />
            <span>{nome}</span>
          </button>
        ))}
      </nav>

      {form && <FormMovimento movimento={form.movimento} categorias={categorias} fechar={fecharForm} />}
    </div>
  );
}
