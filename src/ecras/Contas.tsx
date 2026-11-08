import { useRef, useState } from 'preact/hooks';
import { fecharComAnimacao, Folha } from '../componentes/Folha';
import { Icone, type NomeIcone } from '../componentes/Icone';
import { atualizarSaldos, guardarConta } from '../dados/db';
import { vibrar } from '../interacao';
import { saldoConta, seriePatrimonio, totalContas } from '../dominio/contas';
import { isoParaPt, mesAtual, nomeMesSo, somarMeses } from '../dominio/datas';
import { centParaTexto, formatarEuros, lerSaldo } from '../dominio/dinheiro';
import { NOMES_CORES, PALETA, TIPOS_CONTA, type Acerto, type Categoria, type Conta, type Movimento, type TipoConta } from '../dominio/tipos';

type Props = { movimentos: Movimento[]; categorias: Categoria[]; contas: Conta[]; acertos: Acerto[] };

export const ICONE_CONTA: Record<TipoConta, NomeIcone> = {
  ordem: 'banco',
  poupanca: 'cofre',
  dinheiro: 'notas',
  cartao: 'cartao',
  investimento: 'investimento',
};

type Edicao = { id?: string; nome: string; tipo: TipoConta; cor: string; arquivada: boolean };

export function Contas({ movimentos, contas, acertos }: Props) {
  const [atualizar, setAtualizar] = useState(false);
  const [edicao, setEdicao] = useState<Edicao | null>(null);
  const [aviso, setAviso] = useState<string[] | null>(null);
  const [verArquivadas, setVerArquivadas] = useState(false);

  const { total, porConta } = totalContas(contas, movimentos, acertos);
  const ativas = contas.filter((c) => !c.arquivada);
  const arquivadas = contas.filter((c) => c.arquivada);
  const positivo = ativas.reduce((s, c) => s + Math.max(0, porConta[c.id] ?? 0), 0);
  // Variação: total de hoje comparado com o fim do mês passado.
  const fimMesPassado = seriePatrimonio(contas, movimentos, acertos, somarMeses(mesAtual(), -1), 1)[0].total;
  const variacaoMes = total - fimMesPassado;

  const ultimoAcerto = (id: string) =>
    acertos.filter((a) => a.contaId === id).sort((a, b) => (a.data === b.data ? a.criadoEm - b.criadoEm : a.data < b.data ? -1 : 1)).pop();

  const linha = (c: Conta) => {
    const saldo = porConta[c.id] ?? 0;
    const ultimo = ultimoAcerto(c.id);
    const parte = positivo > 0 && saldo > 0 ? Math.round((saldo / positivo) * 100) : 0;
    return (
      <li key={c.id}>
        <button class="conta-linha" style={{ '--cor': c.cor }} onClick={() => setEdicao({ ...c })}>
          <span class="conta-icone"><Icone nome={ICONE_CONTA[c.tipo]} /></span>
          <span class="conta-texto">
            <span>{c.nome}</span>
            <small>{ultimo ? `Atualizada a ${isoParaPt(ultimo.data)}` : 'Saldo por definir'}</small>
          </span>
          <span class="conta-valor">
            <strong class={`num ${saldo < 0 ? 'negativo' : ''}`}>{formatarEuros(saldo)}</strong>
            {!c.arquivada && parte > 0 && <small>{parte}%</small>}
          </span>
        </button>
        {!c.arquivada && <div class="barra-fundo"><div class="barra-cheia" style={{ width: `${parte}%`, background: c.cor, '--cor': c.cor }} /></div>}
      </li>
    );
  };

  return (
    <>
      <header class="cabecalho-simples">
        <h1>Contas</h1>
        <button class="btn-texto" onClick={() => setEdicao({ nome: '', tipo: 'ordem', cor: PALETA[contas.length % PALETA.length], arquivada: false })}>+ Nova</button>
      </header>

      <section class="totais">
        <div class="total total-gastos">
          <span class="rotulo">Total em todas as contas</span>
          <strong>{formatarEuros(total)}</strong>
          <span class="variacao">
            {variacaoMes === 0 ? `Igual ao fim de ${nomeMesSo(somarMeses(mesAtual(), -1))}` : `${variacaoMes > 0 ? '+' : '−'}${formatarEuros(Math.abs(variacaoMes))} desde o fim de ${nomeMesSo(somarMeses(mesAtual(), -1))}`}
          </span>
        </div>
      </section>

      {aviso && (
        <button class="aviso aviso-ok" onClick={() => setAviso(null)}>
          <span>{aviso.map((l) => <span key={l} class="aviso-linha">{l}</span>)}</span>
        </button>
      )}

      <button class="btn-principal btn-largo" onClick={() => setAtualizar(true)}>Atualizar saldos</button>

      <section class="cartao">
        <h2>Onde está o dinheiro</h2>
        <ul class="lista-contas">{ativas.map(linha)}</ul>
        {ativas.length === 0 && <p class="nota">Ainda não tens contas. Toca em “+ Nova”.</p>}
      </section>

      {arquivadas.length > 0 && (
        <section class="cartao">
          <button class="btn-texto" onClick={() => setVerArquivadas(!verArquivadas)}>
            {verArquivadas ? 'Esconder' : 'Ver'} contas arquivadas ({arquivadas.length})
          </button>
          {verArquivadas && <ul class="lista-contas arquivadas">{arquivadas.map(linha)}</ul>}
        </section>
      )}

      {atualizar && (
        <AtualizarSaldos contas={ativas} movimentos={movimentos} acertos={acertos}
          fechar={(r) => { setAtualizar(false); if (r) setAviso(r); }} />
      )}
      {edicao && <EditarConta edicao={edicao} contas={contas} fechar={() => setEdicao(null)} />}
    </>
  );
}

function AtualizarSaldos({ contas, movimentos, acertos, fechar }: {
  contas: Conta[]; movimentos: Movimento[]; acertos: Acerto[]; fechar: (resumo?: string[]) => void;
}) {
  const inicial = Object.fromEntries(contas.map((c) => [c.id, centParaTexto(saldoConta(c.id, movimentos, acertos))]));
  const [valores, setValores] = useState<Record<string, string>>(inicial);
  const [erros, setErros] = useState<Record<string, boolean>>({});
  const ref = useRef<HTMLDivElement>(null);

  async function guardar() {
    const novos: { contaId: string; saldoCent: number }[] = [];
    const e: Record<string, boolean> = {};
    for (const c of contas) {
      const v = lerSaldo(valores[c.id] ?? '');
      if (v === null) e[c.id] = true;
      else novos.push({ contaId: c.id, saldoCent: v });
    }
    setErros(e);
    if (Object.keys(e).length) { vibrar([12, 60, 12]); return; }
    const alteradas = await atualizarSaldos(novos);
    vibrar(18);
    const nome = new Map(contas.map((c) => [c.id, c.nome]));
    const resumo = alteradas.length === 0
      ? ['Os saldos já estavam certos.']
      : alteradas.map((a) => `${nome.get(a.contaId)}: ${a.diferenca > 0 ? 'entrou' : 'saiu'} ${formatarEuros(Math.abs(a.diferenca))} que não estava registado.`);
    fecharComAnimacao(ref.current, () => fechar(resumo));
  }

  return (
    <Folha titulo="Atualizar saldos" fechar={() => fechar()} aoSubmeter={guardar}>
      <div ref={ref} class="campos-saldo">
        <p class="nota">Escreve quanto tens agora em cada conta (vê no banco). Num cartão de crédito, uma dívida escreve-se com “−”.</p>
        {contas.map((c) => (
          <label key={c.id} class="campo campo-saldo" style={{ '--cor': c.cor }}>
            <span><span class="conta-icone pequeno"><Icone nome={ICONE_CONTA[c.tipo]} /></span>{c.nome}</span>
            <div class="valor-saldo">
              <input inputMode="decimal" autoComplete="off" value={valores[c.id]} aria-invalid={!!erros[c.id]}
                onFocus={(e) => e.currentTarget.select()}
                onInput={(e) => { const v = e.currentTarget.value; setValores((p) => ({ ...p, [c.id]: v })); }} />
              <span>€</span>
            </div>
            {erros[c.id] && <small class="erro">Valor inválido</small>}
          </label>
        ))}
      </div>
      <div class="acoes">
        <button type="submit" class="btn-principal">Guardar saldos</button>
      </div>
    </Folha>
  );
}

function EditarConta({ edicao: inicial, contas, fechar }: { edicao: Edicao; contas: Conta[]; fechar: () => void }) {
  const [e, setE] = useState(inicial);
  const [erro, setErro] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  async function guardar() {
    const nome = e.nome.trim();
    if (!nome) { setErro('Escreve um nome'); return; }
    if (contas.some((c) => c.id !== e.id && c.nome.toLowerCase() === nome.toLowerCase())) { setErro('Já existe uma conta com este nome'); return; }
    await guardarConta({ ...e, nome });
    vibrar(18);
    fecharComAnimacao(ref.current, fechar);
  }

  return (
    <Folha titulo={e.id ? 'Editar conta' : 'Nova conta'} fechar={fechar} aoSubmeter={guardar}>
      <div ref={ref} class="campos-conta">
        <label class="campo">
          <span>Nome</span>
          <input value={e.nome} maxLength={30} placeholder="Ex.: Millennium, Poupança férias" onInput={(ev) => { const v = ev.currentTarget.value; setE((p) => ({ ...p, nome: v })); }} />
          {erro && <small class="erro">{erro}</small>}
        </label>
        <fieldset class="campo">
          <legend>Tipo</legend>
          <div class="grelha-cats">
            {TIPOS_CONTA.map((t) => (
              <button key={t.tipo} type="button" class={`chip chip-icone ${e.tipo === t.tipo ? 'ativo' : ''}`} style={{ '--cor': e.cor }}
                aria-pressed={e.tipo === t.tipo} onClick={() => setE((p) => ({ ...p, tipo: t.tipo }))}>
                <Icone nome={ICONE_CONTA[t.tipo]} />{t.nome}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset class="campo">
          <legend>Cor</legend>
          <div class="paleta">
            {PALETA.map((p, i) => (
              <button key={p} type="button" class={`cor ${e.cor === p ? 'ativo' : ''}`} style={{ background: p }}
                aria-label={NOMES_CORES[i]} aria-pressed={e.cor === p} onClick={() => setE((x) => ({ ...x, cor: p }))} />
            ))}
          </div>
        </fieldset>
        {e.id && (
          <label class="interruptor">
            <input type="checkbox" checked={e.arquivada} onChange={(ev) => { const v = ev.currentTarget.checked; setE((p) => ({ ...p, arquivada: v })); }} />
            <span>Arquivar (deixa de aparecer ao registar; o saldo continua a contar no total)</span>
          </label>
        )}
      </div>
      <div class="acoes">
        <button type="submit" class="btn-principal">Guardar</button>
      </div>
    </Folha>
  );
}
