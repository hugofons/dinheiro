import { useLiveQuery } from 'dexie-react-hooks';
import { Icone } from '../componentes/Icone';
import { lerConfig } from '../dados/db';
import { compararMeses, hojeISO, mesAtual, nomeDia, nomeMes, somarMeses, type Mes } from '../dominio/datas';
import { formatarEuros } from '../dominio/dinheiro';
import { gastosPorCategoria, movimentosDoMes, totaisMes } from '../dominio/resumos';
import type { Categoria, Movimento } from '../dominio/tipos';

const DIAS_COPIA = 30;

export function precisaCopia(movs: Movimento[], ultimaExportacao: number | undefined, agora = Date.now()): boolean {
  const limite = agora - DIAS_COPIA * 86_400_000;
  if (ultimaExportacao) return ultimaExportacao < limite;
  return movs.some((m) => m.criadoEm < limite);
}

type Props = {
  mes: Mes;
  setMes: (m: Mes) => void;
  movimentos: Movimento[];
  categorias: Categoria[];
  abrir: (m: Movimento) => void;
  irDefinicoes: () => void;
};

export function MesEcra({ mes, setMes, movimentos, categorias, abrir, irDefinicoes }: Props) {
  const ultimaExportacao = useLiveQuery(() => lerConfig<number>('ultimaExportacao'), [], undefined);
  const cats = new Map(categorias.map((c) => [c.id, c]));
  const totais = totaisMes(movimentos, mes);
  const porCat = gastosPorCategoria(movimentos, mes);
  const dias = movimentosDoMes(movimentos, mes);
  const noAtual = compararMeses(mes, mesAtual()) >= 0;
  const maior = porCat[0]?.total ?? 1;
  const hoje = hojeISO();

  return (
    <>
      <header class="cabecalho-mes">
        <button class="icone-btn" aria-label="Mês anterior" onClick={() => setMes(somarMeses(mes, -1))}><Icone nome="esquerda" /></button>
        <h1>{nomeMes(mes).replace(/^./, (c) => c.toUpperCase())}</h1>
        <button class="icone-btn" aria-label="Mês seguinte" disabled={noAtual} onClick={() => setMes(somarMeses(mes, 1))}><Icone nome="direita" /></button>
      </header>

      {precisaCopia(movimentos, ultimaExportacao) && (
        <button class="aviso" onClick={irDefinicoes}>
          <Icone nome="aviso" />
          <span>Faz uma cópia de segurança dos teus dados</span>
        </button>
      )}

      <section class="totais">
        <div class="total total-gastos">
          <span class="rotulo">Gastos</span>
          <strong>{formatarEuros(totais.gastos)}</strong>
        </div>
        <div class="total-par">
          <div class="total">
            <span class="rotulo">Receitas</span>
            <strong>{formatarEuros(totais.receitas)}</strong>
          </div>
          <div class="total">
            <span class="rotulo">Saldo</span>
            <strong class={totais.saldo >= 0 ? 'positivo' : 'negativo'}>{formatarEuros(totais.saldo)}</strong>
          </div>
        </div>
      </section>

      {dias.length === 0 ? (
        <p class="vazio">Ainda não há movimentos neste mês.<br />Toca em <strong>+</strong> para registar o primeiro.</p>
      ) : (
        <>
          {porCat.length > 0 && (
            <section class="cartao">
              <h2>Por categoria</h2>
              <ul class="categorias-barras">
                {porCat.map((p) => {
                  const c = cats.get(p.categoriaId);
                  return (
                    <li key={p.categoriaId}>
                      <div class="linha-cat">
                        <span>{c?.nome ?? 'Sem categoria'}</span>
                        <span class="num">{formatarEuros(p.total)} <small>{p.percent}%</small></span>
                      </div>
                      <div class="barra-fundo"><div class="barra-cheia" style={{ width: `${(p.total / maior) * 100}%`, background: c?.cor, "--cor": c?.cor }} /></div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section class="cartao">
            <h2>Movimentos</h2>
            {dias.map((d) => (
              <div key={d.data} class="dia">
                <h3>{d.data === hoje ? 'Hoje' : nomeDia(d.data)}</h3>
                <ul class="movimentos">
                  {d.movs.map((m) => {
                    const c = cats.get(m.categoriaId);
                    return (
                      <li key={m.id}>
                        <button class="movimento" onClick={() => abrir(m)}>
                          <span class="bolinha" style={{ background: c?.cor, "--cor": c?.cor }} />
                          <span class="mov-texto">
                            <span>{c?.nome ?? 'Sem categoria'}</span>
                            {m.nota && <small>{m.nota}</small>}
                          </span>
                          <span class={`num ${m.tipo === 'receita' ? 'positivo' : ''}`}>
                            {m.tipo === 'despesa' ? '−' : '+'}{formatarEuros(m.valorCent)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </section>
        </>
      )}
    </>
  );
}
