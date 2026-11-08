import { render } from 'preact';
import { App } from './app';
import { db, garantirCategoriasIniciais } from './dados/db';
import './estilo.css';

const raiz = document.getElementById('app')!;

async function arrancar() {
  try {
    await db.open();
    await garantirCategoriasIniciais();
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
