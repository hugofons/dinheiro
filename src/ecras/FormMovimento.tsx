import { useEffect, useRef, useState } from 'preact/hooks';
import { Icone } from '../componentes/Icone';
import { apagarMovimento, guardarMovimento, lerConfig } from '../dados/db';
import { vibrar } from '../interacao';
import { hojeISO } from '../dominio/datas';
import { centParaTexto, lerValor } from '../dominio/dinheiro';
import { NOTA_MAX, type Categoria, type Conta, type Movimento, type TipoMovimento } from '../dominio/tipos';
import { ICONE_CONTA } from './Contas';

const TIPOS = [['despesa', 'Despesa'], ['receita', 'Receita'], ['transferencia', 'Transferência']] as const;

type Props = {
  movimento?: Movimento;
  categorias: Categoria[];
  contas: Conta[];
  fechar: (dataGuardada?: string) => void;
};

export function FormMovimento({ movimento, categorias, contas, fechar }: Props) {
  const [tipo, setTipo] = useState<TipoMovimento>(movimento?.tipo ?? 'despesa');
  const [contaId, setContaId] = useState(movimento?.contaId ?? '');
  const [contaDestinoId, setContaDestinoId] = useState(movimento?.contaDestinoId ?? '');
  const transferencia = tipo === 'transferencia';
  const contasVisiveis = contas.filter((c) => !c.arquivada || c.id === movimento?.contaId || c.id === movimento?.contaDestinoId);
  const [valor, setValor] = useState(movimento ? centParaTexto(movimento.valorCent) : '');
  const [categoriaId, setCategoriaId] = useState(movimento?.categoriaId ?? '');
  const [data, setData] = useState(movimento?.data ?? hojeISO());
  const [nota, setNota] = useState(movimento?.nota ?? '');
  const [erros, setErros] = useState<{ valor?: string; categoria?: string; conta?: string; data?: string; geral?: string }>({});
  const [aGuardar, setAGuardar] = useState(false);
  const [confirmarApagar, setConfirmarApagar] = useState(false);
  const campoValor = useRef<HTMLInputElement>(null);
  const [saindo, setSaindo] = useState(false);
  const [abanar, setAbanar] = useState(0);

  // Fecha com animação de saída (a folha desce antes de desaparecer).
  const sair = (dataGuardada?: string) => {
    if (saindo) return;
    setSaindo(true);
    const semMovimento = matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTimeout(() => fechar(dataGuardada), semMovimento ? 0 : 220);
  };

  const doTipo = categorias.filter((c) => !transferencia && c.tipo === tipo && (!c.escondida || c.id === movimento?.categoriaId));

  useEffect(() => {
    if (!movimento) campoValor.current?.focus();
  }, []);

  useEffect(() => {
    if (contaId) return;
    lerConfig<string>('ultimaConta').then((ultima) => {
      setContaId(contasVisiveis.some((c) => c.id === ultima) ? ultima! : contasVisiveis[0]?.id ?? '');
    });
  }, []);

  useEffect(() => {
    if (transferencia && (!contaDestinoId || contaDestinoId === contaId)) setContaDestinoId(contasVisiveis.find((c) => c.id !== contaId)?.id ?? '');
  }, [tipo, contaId]);

  useEffect(() => {
    if (transferencia || doTipo.some((c) => c.id === categoriaId)) return;
    lerConfig<string>(`ultimaCategoria:${tipo}`).then((ultima) => {
      setCategoriaId(doTipo.some((c) => c.id === ultima) ? ultima! : doTipo[0]?.id ?? '');
    });
  }, [tipo]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && sair();
    addEventListener('keydown', esc);
    return () => removeEventListener('keydown', esc);
  }, []);

  function escolherConta(rotulo: string, valorAtual: string, mudar: (id: string) => void, excluir?: string) {
    return (
      <fieldset class="campo">
        <legend>{rotulo}</legend>
        <div class="grelha-cats">
          {contasVisiveis.filter((c) => c.id !== excluir).map((c) => (
            <button key={c.id} type="button" class={`chip chip-icone ${c.id === valorAtual ? 'ativo' : ''}`} aria-pressed={c.id === valorAtual}
              style={{ '--cor': c.cor }} onClick={() => mudar(c.id)}>
              <Icone nome={ICONE_CONTA[c.tipo]} />{c.nome}
            </button>
          ))}
        </div>
      </fieldset>
    );
  }

  async function guardar(e: Event) {
    e.preventDefault();
    const cent = lerValor(valor);
    const novos: typeof erros = {};
    if (cent === null) novos.valor = valor.trim() ? 'Valor inválido (máx. 2 casas decimais, até 1 000 000 €)' : 'Escreve o valor';
    if (!transferencia && !categoriaId) novos.categoria = 'Escolhe uma categoria';
    if (!contaId) novos.conta = 'Escolhe a conta';
    else if (transferencia && (!contaDestinoId || contaDestinoId === contaId)) novos.conta = 'Escolhe duas contas diferentes';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) novos.data = 'Escolhe uma data';
    setErros(novos);
    if (Object.keys(novos).length) {
      setAbanar((n) => n + 1);
      vibrar([12, 60, 12]);
      return;
    }
    setAGuardar(true);
    try {
      await guardarMovimento({ id: movimento?.id, tipo, valorCent: cent!, categoriaId: transferencia ? '' : categoriaId, contaId, contaDestinoId: transferencia ? contaDestinoId : undefined, data, nota });
      vibrar(18);
      sair(data);
    } catch {
      setErros({ geral: 'Não foi possível guardar. Tenta outra vez.' });
      setAGuardar(false);
    }
  }

  async function apagar() {
    if (!confirmarApagar) { setConfirmarApagar(true); return; }
    try {
      await apagarMovimento(movimento!.id);
      vibrar(18);
      sair();
    } catch {
      setErros({ geral: 'Não foi possível apagar. Tenta outra vez.' });
    }
  }

  return (
    <div class={`folha-fundo ${saindo ? 'saindo' : ''}`} onClick={(e) => e.target === e.currentTarget && sair()}>
      <form class="folha" onSubmit={guardar} noValidate>
        <header class="folha-cabecalho">
          <h2>{movimento ? 'Editar movimento' : 'Novo movimento'}</h2>
          <button type="button" class="icone-btn" aria-label="Fechar" onClick={() => sair()}><Icone nome="fechar" /></button>
        </header>

        <div class="alternador" role="radiogroup" aria-label="Tipo" data-lado={tipo} style={{ '--i': TIPOS.findIndex(([t]) => t === tipo), '--n': TIPOS.length }}>
          {TIPOS.map(([t, nome]) => (
            <button key={t} type="button" role="radio" aria-checked={tipo === t} class={tipo === t ? `ativo ${t}` : ''} onClick={() => setTipo(t)}>
              {nome}
            </button>
          ))}
        </div>

        <label class="campo">
          <span>Valor</span>
          <div class={`valor-entrada ${abanar ? (abanar % 2 ? 'abanar-a' : 'abanar-b') : ''}`}>
            <input ref={campoValor} inputMode="decimal" autoComplete="off" placeholder="0,00" value={valor}
              aria-invalid={!!erros.valor} onInput={(e) => setValor(e.currentTarget.value)} />
            <span>€</span>
          </div>
          {erros.valor && <small class="erro">{erros.valor}</small>}
        </label>

        {transferencia ? (
          <>
            {escolherConta('De', contaId, setContaId)}
            {escolherConta('Para', contaDestinoId, setContaDestinoId, contaId)}
            {contasVisiveis.length < 2 && <p class="nota">Para transferir, cria outra conta no separador Contas.</p>}
            {erros.conta && <small class="erro">{erros.conta}</small>}
          </>
        ) : (
          contasVisiveis.length > 1 && (
            <>
              {escolherConta(tipo === 'despesa' ? 'Sai de' : 'Entra em', contaId, setContaId)}
              {erros.conta && <small class="erro">{erros.conta}</small>}
            </>
          )
        )}

        {!transferencia && <fieldset class="campo">
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
        </fieldset>}

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
