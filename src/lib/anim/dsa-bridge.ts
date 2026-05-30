// Bridge module — turns each brain-detox DSA visualization into a sysviz
// `AnimModule` so the existing registry, gallery, and mount runtime can
// drive it like a native anim.

import type { AnimHandle } from './types';
import '~/styles/dsa-engine.css';
import '~/lib/dsa-engine/loader';

interface DsaGlobal {
  mount: (host: HTMLElement) => void;
}

declare global {
  interface Window {
    DSA?: DsaGlobal;
  }
}

/**
 * Mount a brain-detox DSA algorithm into a sysviz host element.
 *
 * The brain-detox engine looks for `.dsa-viz[data-algo]` elements and
 * renders its standard header/code/stage/controls layout inside. We adopt
 * the host into that shape and delegate.
 */
export function mountDsa(host: HTMLElement, algoId: string): AnimHandle {
  // Prepare the host the way the engine expects.
  host.innerHTML = '';
  host.classList.add('dsa-viz');
  host.dataset['algo'] = algoId;
  delete host.dataset['mounted'];

  const render = (): void => {
    const dsa = window.DSA;
    if (!dsa?.mount) {
      host.innerHTML =
        '<p style="color:var(--anim-danger);font-family:var(--font-code)">DSA engine not loaded.</p>';
      return;
    }
    try {
      dsa.mount(host);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      host.innerHTML = `<p style="color:var(--anim-danger);font-family:var(--font-code)">Visualization failed: ${msg}</p>`;
    }
  };

  render();

  return {
    pause() {
      // Engine drives playback via user controls (Play/Pause/Step). Nothing
      // to suspend when the host scrolls off-screen.
    },
    resume() {},
    reset() {
      host.innerHTML = '';
      delete host.dataset['mounted'];
      render();
    },
    destroy() {
      host.innerHTML = '';
      host.classList.remove('dsa-viz');
      delete host.dataset['algo'];
      delete host.dataset['mounted'];
    },
  };
}
