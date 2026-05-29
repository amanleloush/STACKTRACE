import type { AnimModule, AnimHandle } from '~/lib/anim/types';
import { buildFrame, svgEl, htmlEl, makeBtn } from '~/lib/anim/svg';
import { token, onThemeChange } from '~/lib/anim/theme';
import meta from './meta';

// Ported from Brain-Detox-arc/docs/javascripts/animations.js:922-1001.
interface Event {
  t: number;
}

const LIMIT = 5;
const WINDOW_SECONDS = 5;

const rateWindow: AnimModule = {
  ...meta,

  mount(host): AnimHandle {
    const { stage, controls, readout } = buildFrame(host, {
      title: meta.title,
      caption: meta.caption,
      badge: 'Interactive',
    });

    const svg = svgEl('svg', {
      viewBox: '0 0 480 220',
      width: 480,
      style: 'max-width:100%;height:auto;',
    });
    stage.appendChild(svg);

    let events: Event[] = [];

    function label(x: number, y: number, str: string, mono = false): SVGTextElement {
      const t = svgEl('text', {
        x,
        y,
        fill: token('--anim-text-muted'),
        'font-size': 11,
        'font-family': mono ? 'JetBrains Mono, monospace' : 'inherit',
      });
      t.textContent = str;
      return t;
    }

    function draw(): void {
      svg.innerHTML = '';
      // Baseline axes for fixed (top) + sliding (bottom)
      svg.appendChild(svgEl('line', { x1: 30, y1: 100, x2: 460, y2: 100, stroke: token('--anim-edge-idle'), 'stroke-width': 1 }));
      svg.appendChild(svgEl('line', { x1: 30, y1: 200, x2: 460, y2: 200, stroke: token('--anim-edge-idle'), 'stroke-width': 1 }));

      // Window dividers (every 5 seconds across a 20-second span)
      for (let i = 0; i <= 4; i++) {
        const x = 30 + i * 107;
        svg.appendChild(
          svgEl('line', {
            x1: x,
            y1: 60,
            x2: x,
            y2: 220,
            stroke: token('--anim-edge-idle'),
            'stroke-dasharray': '3 3',
            opacity: 0.5,
          }),
        );
      }
      svg.appendChild(label(30, 50, 'Fixed window (counter resets every 5s)'));
      svg.appendChild(label(30, 155, 'Sliding window (last 5s)'));

      for (const e of events) {
        const x = 30 + (e.t / 20) * 430;
        const win = Math.floor(e.t / WINDOW_SECONDS);
        const idxInWin = events.filter((x) => Math.floor(x.t / WINDOW_SECONDS) === win && x.t <= e.t).length;
        const fixedOK = idxInWin <= LIMIT;
        const slidIdx = events.filter((x) => x.t > e.t - WINDOW_SECONDS && x.t <= e.t).length;
        const slidOK = slidIdx <= LIMIT;
        svg.appendChild(svgEl('circle', { cx: x, cy: 90, r: 6, fill: fixedOK ? token('--anim-success') : token('--anim-danger') }));
        svg.appendChild(svgEl('circle', { cx: x, cy: 190, r: 6, fill: slidOK ? token('--anim-success') : token('--anim-danger') }));
      }

      const fixedDenied = events.filter((e, _, arr) => {
        const win = Math.floor(e.t / WINDOW_SECONDS);
        return arr.filter((x) => Math.floor(x.t / WINDOW_SECONDS) === win && x.t <= e.t).length > LIMIT;
      }).length;
      const slidDenied = events.filter(
        (e, _, arr) => arr.filter((x) => x.t > e.t - WINDOW_SECONDS && x.t <= e.t).length > LIMIT,
      ).length;

      readout.innerHTML = '';
      readout.appendChild(htmlEl('span', {}, `limit: ${LIMIT}/${WINDOW_SECONDS}s`));
      readout.appendChild(htmlEl('span', {}, `events: ${events.length}`));
      readout.appendChild(htmlEl('span', {}, `fixed denied: ${fixedDenied}`));
      readout.appendChild(htmlEl('span', {}, `sliding denied: ${slidDenied}`));
    }

    function pushAt(ts: number): void {
      events.push({ t: ts });
    }

    controls.appendChild(
      makeBtn('edge-burst (worst case)', () => {
        events = [];
        for (let i = 0; i < 5; i++) pushAt(4 + i * 0.15);
        for (let i = 0; i < 5; i++) pushAt(5 + i * 0.15);
        draw();
      }),
    );
    controls.appendChild(
      makeBtn('steady traffic', () => {
        events = [];
        for (let i = 0; i < 18; i++) pushAt(i * 1.1);
        draw();
      }),
    );
    controls.appendChild(
      makeBtn('clear', () => {
        events = [];
        draw();
      }),
    );

    const offTheme = onThemeChange(() => draw());
    draw();

    return {
      pause(): void {
        /* static */
      },
      resume(): void {
        /* static */
      },
      reset(): void {
        events = [];
        draw();
      },
      destroy(): void {
        offTheme();
        host.innerHTML = '';
      },
    };
  },
};

export default rateWindow;
