import { BarController, BarElement, CategoryScale, Chart, Legend, LinearScale, LineController, LineElement, PointElement, Tooltip } from 'chart.js';
import { useEffect, useRef, useState } from 'preact/hooks';
import { mesAtual, nomeMesCurto, nomeMesSo, somarMeses } from '../dominio/datas';
import { formatarEuros } from '../dominio/dinheiro';
import { serieMeses, variacao } from '../dominio/resumos';
import type { Categoria, Movimento } from '../dominio/tipos';

Chart.register(BarController, BarElement, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend);

type Props = { movimentos: Movimento[]; categorias: Categoria[] };

const cor = (nome: string) => getComputedStyle(document.documentElement).getPropertyValue(nome).trim();

export function Evolucao({ movimentos, categorias }: Props) {
  const [categoriaId, setCategoriaId] = useState('');
  const canvas = useRef<HTMLCanvasElement>(null);
  const atual = mesAtual();
  const serie = serieMeses(movimentos, atual, 12, categoriaId || undefined);
  const categoria = categorias.find((c) => c.id === categoriaId);

  const media = Math.round(serie.reduce((s, p) => s + p.gastos, 0) / serie.length);
  const gastoAtual = serie[11].gastos;
  const gastoAnterior = serie[10].gastos;
  const v = variacao(gastoAtual, gastoAnterior);
  const nomeAnterior = nomeMesSo(somarMeses(atual, -1));

  useEffect(() => {
    if (!canvas.current) return;
    const texto = cor('--texto-2');
    const grelha = cor('--linha');
    const datasets: any[] = [
      { type: 'bar', label: 'Gastos', data: serie.map((p) => p.gastos / 100), backgroundColor: categoria?.cor ?? cor('--gasto'), borderRadius: 4, order: 2 },
    ];
    if (!categoria) {
      datasets.push(
        { type: 'bar', label: 'Receitas', data: serie.map((p) => p.receitas / 100), backgroundColor: cor('--receita'), borderRadius: 4, order: 2 },
        { type: 'line', label: 'Saldo', data: serie.map((p) => p.saldo / 100), borderColor: cor('--texto'), backgroundColor: cor('--texto'), pointRadius: 3, borderWidth: 2, tension: 0.3, order: 1 },
      );
    }
    const grafico = new Chart(canvas.current, {
      data: { labels: serie.map((p) => nomeMesCurto(p.mes)), datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'bottom', labels: { color: texto, boxWidth: 12, usePointStyle: true } },
          tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${formatarEuros(Math.round((c.raw as number) * 100))}` } },
        },
        scales: {
          x: { ticks: { color: texto }, grid: { display: false } },
          y: { ticks: { color: texto, callback: (x) => `${Number(x).toLocaleString('pt-PT')} €`, maxTicksLimit: 6 }, grid: { color: grelha } },
        },
      },
    });
    return () => grafico.destroy();
  }, [movimentos, categoriaId, categorias]);

  const despesas = categorias.filter((c) => c.tipo === 'despesa');

  return (
    <>
      <header class="cabecalho-simples"><h1>Evolução</h1></header>

      <label class="campo seletor">
        <span class="sr">Categoria</span>
        <select value={categoriaId} onChange={(e) => setCategoriaId(e.currentTarget.value)}>
          <option value="">Todas as categorias</option>
          {despesas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </label>

      <section class="cartao">
        <h2>Últimos 12 meses</h2>
        <div class="grafico"><canvas ref={canvas} aria-label="Gráfico de gastos e receitas dos últimos 12 meses" role="img" /></div>
      </section>

      <section class="totais">
        <div class="total-par">
          <div class="total">
            <span class="rotulo">Média mensal de gastos</span>
            <strong>{formatarEuros(media)}</strong>
          </div>
          <div class="total">
            <span class="rotulo">Este mês vs. {nomeAnterior}</span>
            <strong class={v === null ? '' : v > 0 ? 'negativo' : 'positivo'}>
              {v === null ? '—' : `${v > 0 ? '+' : ''}${v} %`}
            </strong>
          </div>
        </div>
      </section>
      {movimentos.length === 0 && <p class="vazio">Quando registares movimentos, a evolução aparece aqui.</p>}
    </>
  );
}
