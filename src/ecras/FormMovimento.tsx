import { useEffect, useRef, useState } from 'preact/hooks';
import { Icone } from '../componentes/Icone';
import { apagarMovimento, guardarMovimento, lerConfig } from '../dados/db';
import { hojeISO } from '../dominio/datas';
import { centParaTexto, lerValor } from '../dominio/dinheiro';
import { NOTA_MAX, type Categoria, type Movimento, type Tipo } from '../dominio/tipos';

type Props = {
  movimento?: Movimento;
  categorias: Categoria[];
  fechar: (dataGuardada?: string) => void;
};

export function FormMovimento({ movimento, categorias, fechar }: Props) {
  const [tipo, setTipo] = useState<Tipo>(movimento?.tipo ?? 'despesa');
  const [valor, setValor] = useState(movimento ? centParaTexto(movimento.valorCent) : '');
  const [categoriaId, setCategoriaId] = useState(movimento?.categoriaId ?? '');
  const [data, setData] = useState(movimento?.data ?? hojeISO());
  const [nota, setNota] = useState(movimento?.nota ?? '');
  const [erros, setErros] = useState<{ valor?: string; categoria?: string; data?: string; geral?: string }>({});
  const [aGuardar, setAGuardar] = useState(false);
  const [confirmarApagar, setConfirmarApagar] = useState(false);
  const campoValor = useRef<HTMLInputElement>(null);

  const doTipo = categorias.filter((c) => c.tipo === tipo && (!c.escondida || c.id === movimento?.categoriaId));

  useEffect(() => {
    if (!movimento) campoValor.current?.focus();
  }, []);

  useEffect(() => {
    if (doTipo.some((c) => c.id === categoriaId)) return;
    lerConfig<string>(`ultimaCategoria:${tipo}`).then((ultima) => {
      setCategoriaId(doTipo.some((c) => c.id === ultima) ? ultima! : doTipo[0]?.id ?? '');
    });
  }, [tipo]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && fechar();
    addEventListener('keydown', esc);
    return () => removeEventListener('keydown', esc);
  }, []);

  async function guardar(e: Event) {
    e.preventDefault();
    const cent = lerValor(valor);
    const novos: typeof erros = {};
    if (cent === null) novos.valor = valor.trim() ? 'Valor inválido (máx. 2 casas decimais, até 1 000 000 €)' : 'Escreve o valor';
    if (!categoriaId) novos.categoria = 'Escolhe uma categoria';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) novos.data = 'Escolhe uma data';
    setErros(novos);
    if (Object.keys(novos).length) return;
    setAGuardar(true);
    try {
      await guardarMovimento({ id: movimento?.id, tipo, valorCent: cent!, categoriaId, data, nota });
      fechar(data);
    } catch {
      setErros({ geral: 'Não foi possível guardar. Tenta outra vez.' });
      setAGuardar(false);
    }
  }

  async function apagar() {
    if (!confirmarApagar) { setConfirmarApagar(true); return; }
    try {
      await apagarMovimento(movimento!.id);
      fechar();
    } catch {
      setErros({ geral: 'Não foi possível apagar. Tenta outra vez.' });
    }
  }

  return (
    <div class="folha-fundo" onClick={(e) => e.target === e.currentTarget && fechar()}>
      <form class="folha" onSubmit={guardar} noValidate>
        <header class="folha-cabecalho">
          <h2>{movimento ? 'Editar movimento' : 'Novo movimento'}</h2>
          <button type="button" class="icone-btn" aria-label="Fechar" onClick={() => fechar()}><Icone nome="fechar" /></button>
        </header>

        <div class="alternador" role="radiogroup" aria-label="Tipo">
          {(['despesa', 'receita'] as const).map((t) => (
            <button key={t} type="button" role="radio" aria-checked={tipo === t} class={tipo === t ? `ativo ${t}` : ''} onClick={() => setTipo(t)}>
              {t === 'despesa' ? 'Despesa' : 'Receita'}
            </button>
          ))}
        </div>

        <label class="campo">
          <span>Valor</span>
          <div class="valor-entrada">
            <input ref={campoValor} inputMode="decimal" autoComplete="off" placeholder="0,00" value={valor}
              aria-invalid={!!erros.valor} onInput={(e) => setValor(e.currentTarget.value)} />
            <span>€</span>
          </div>
          {erros.valor && <small class="erro">{erros.valor}</small>}
        </label>

        <fieldset class="campo">
          <legend>Categoria</legend>
          <div class="grelha-cats">
            {doTipo.map((c) => (
              <button key={c.id} type="button" class={`chip ${c.id === categoriaId ? 'ativo' : ''}`} aria-pressed={c.id === categoriaId}
                style={{ '--cor': c.cor }} onClick={() => setCategoriaId(c.id)}>
                {c.nome}
              </button>
            ))}
          </div>
          {erros.categoria && <small class="erro">{erros.categoria}</small>}
        </fieldset>

        <div class="campos-lado">
          <label class="campo">
            <span>Data</span>
            <input type="date" value={data} max="9999-12-31" onInput={(e) => setData(e.currentTarget.value)} />
            {erros.data && <small class="erro">{erros.data}</small>}
          </label>
        </div>

        <label class="campo">
          <span>Nota <small>(opcional)</small></span>
          <input maxLength={NOTA_MAX} value={nota} placeholder="Ex.: jantar com amigos" onInput={(e) => setNota(e.currentTarget.value)} />
        </label>

        {erros.geral && <p class="erro">{erros.geral}</p>}

        <div class="acoes">
          {movimento && (
            <button type="button" class={`btn-apagar ${confirmarApagar ? 'confirmar' : ''}`} onClick={apagar}>
              {confirmarApagar ? 'Toca outra vez para apagar' : 'Apagar'}
            </button>
          )}
          <button type="submit" class="btn-principal" disabled={aGuardar}>Guardar</button>
        </div>
      </form>
    </div>
  );
}
