import { render } from 'preact';
import { App } from './app';
import { db, garantirDadosIniciais } from './dados/db';
import './estilo.css';
import './temas.css';

import { ligarInteracao } from './interacao';

// Tema Rubi (liquid glass escuro). ?tema=base mostra o estilo base, sem tema.
const temaPedido = new URLSearchParams(location.search).get('tema');
document.documentElement.dataset.tema = temaPedido ?? 'rubi';
ligarInteracao();

const raiz = document.getElementById('app')!;

async function arrancar() {
  try {
    await db.open();
    await garantirDadosIniciais();
  } catch {
    render(
      <div class="sem-armazenamento">
        <h1>Dinheiro</h1>
        <p>Esta app precisa de guardar dados no telemóvel, mas o navegador não deixou.</p>
        <p>Se estiveres num separador anónimo, abre-a num separador normal.</p>
      </div>,
      raiz,
    );
    return;
  }
  navigator.storage?.persist?.().catch(() => {});
  render(<App />, raiz);
}

arrancar();
