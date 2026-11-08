// Efeitos de toque do tema Rubi: reflexo que segue o dedo, luz no fundo,
// inclinação do telemóvel (parallax) e vibração curta ao tocar em botões.

const VIDRO = '.total, .cartao, .icone-btn, .chip, .btn-secundario, .fab, .btn-principal';

export function vibrar(ms: number | number[] = 8) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* sem vibração neste dispositivo */
  }
}

export function ligarInteracao() {
  const raiz = document.documentElement;
  const semMovimento = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let apagarLuz: number | undefined;

  const reflexo = (e: PointerEvent, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  };

  addEventListener('pointerdown', (e) => {
    const alvo = e.target as Element;
    const vidro = alvo.closest<HTMLElement>(VIDRO);
    if (vidro) {
      reflexo(e, vidro);
      vidro.classList.add('tocado');
      const largar = () => {
        setTimeout(() => vidro.classList.remove('tocado'), 250);
        removeEventListener('pointerup', largar);
        removeEventListener('pointercancel', largar);
      };
      addEventListener('pointerup', largar);
      addEventListener('pointercancel', largar);
    }
    if (alvo.closest('button:not(:disabled)')) vibrar();
    moverLuz(e);
  }, { passive: true });

  addEventListener('pointermove', (e) => {
    const vidro = document.querySelector<HTMLElement>('.tocado');
    if (vidro) reflexo(e, vidro);
    if (e.buttons) moverLuz(e);
  }, { passive: true });

  function moverLuz(e: PointerEvent) {
    if (semMovimento) return;
    raiz.style.setProperty('--dedo-x', `${e.clientX}px`);
    raiz.style.setProperty('--dedo-y', `${e.clientY}px`);
    raiz.style.setProperty('--dedo-o', '1');
    clearTimeout(apagarLuz);
    apagarLuz = window.setTimeout(() => raiz.style.setProperty('--dedo-o', '0'), 1400);
  }

  // Inclinar o telemóvel desloca o fundo ligeiramente.
  if (!semMovimento) {
    let pedido = 0;
    addEventListener('deviceorientation', (e) => {
      if (e.gamma == null || e.beta == null || pedido) return;
      pedido = requestAnimationFrame(() => {
        pedido = 0;
        const lim = (v: number) => Math.max(-1, Math.min(1, v));
        raiz.style.setProperty('--incl-x', lim(e.gamma! / 30).toFixed(3));
        raiz.style.setProperty('--incl-y', lim((e.beta! - 45) / 30).toFixed(3));
      });
    });
  }
}
