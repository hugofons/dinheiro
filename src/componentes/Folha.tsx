import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { Icone } from './Icone';

type Props = {
  titulo: string;
  fechar: () => void;
  aoSubmeter?: (e: Event) => void;
  children: ComponentChildren;
};

/** Folha que sobe de baixo, com animação de saída. `fechar` é chamado depois da animação. */
export function Folha({ titulo, fechar, aoSubmeter, children }: Props) {
  const [saindo, setSaindo] = useState(false);
  const sair = () => {
    if (saindo) return;
    setSaindo(true);
    setTimeout(fechar, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 220);
  };

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && sair();
    addEventListener('keydown', esc);
    return () => removeEventListener('keydown', esc);
  }, []);

  return (
    <div class={`folha-fundo ${saindo ? 'saindo' : ''}`} onClick={(e) => e.target === e.currentTarget && sair()}>
      <form class="folha" onSubmit={(e) => { e.preventDefault(); aoSubmeter?.(e); }} noValidate>
        <header class="folha-cabecalho">
          <h2>{titulo}</h2>
          <button type="button" class="icone-btn" aria-label="Fechar" onClick={sair}><Icone nome="fechar" /></button>
        </header>
        {children}
      </form>
    </div>
  );
}

/** Para fechar uma Folha a partir de dentro (depois de guardar) com a mesma animação. */
export function fecharComAnimacao(el: Element | null, fechar: () => void) {
  const fundo = el?.closest('.folha-fundo');
  if (!fundo || matchMedia('(prefers-reduced-motion: reduce)').matches) return fechar();
  fundo.classList.add('saindo');
  setTimeout(fechar, 220);
}
