import type { AnimModule, AnimHandle } from '~/lib/anim/types';
import { buildFrame, svgEl, htmlEl, makeBtn } from '~/lib/anim/svg';
import { token, onThemeChange } from '~/lib/anim/theme';
import meta from './meta';

// Ported from Brain-Detox-arc/docs/javascripts/animations.js:1006-1076.
type Mode = 'saga' | '2pc';

const saga: AnimModule = {
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

    let mode: Mode = 'saga';
    let paused = false;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    function clearTimers(): void {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    }
    function schedule(fn: () => void, ms: number): void {
      const t = setTimeout(() => {
        timers.delete(t);
        if (!paused) fn();
      }, ms);
      timers.add(t);
    }

    function txt(x: number, y: number, str: string, big: boolean): SVGTextElement {
      const t = svgEl('text', {
        x,
        y,
        'text-anchor': 'middle',
        fill: token('--anim-text-muted'),
        'font-size': big ? 13 : 11,
        'font-family': big ? 'inherit' : 'JetBrains Mono, monospace',
        'font-weight': big ? 600 : 400,
      });
      t.textContent = str;
      return t;
    }

    function draw(): void {
      svg.innerHTML = '';
      const services = ['Order', 'Payment', 'Inventory', 'Shipping'];
      services.forEach((s, i) => {
        const x = 60 + i * 110;
        svg.appendChild(svgEl('rect', { x, y: 70, width: 80, height: 40, rx: 6, fill: token('--anim-compare') }));
        const t = svgEl('text', {
          x: x + 40,
          y: 95,
          'text-anchor': 'middle',
          fill: '#0a0a14',
          'font-size': 12,
          'font-weight': 700,
        });
        t.textContent = s;
        svg.appendChild(t);
      });
      svg.appendChild(
        txt(
          240,
          40,
          mode === '2pc'
            ? '2PC — coordinator holds locks across all'
            : 'Saga — local commits + compensations on failure',
          true,
        ),
      );
      svg.appendChild(txt(240, 200, '(red = compensating transaction)', false));

      readout.innerHTML = '';
      if (mode === '2pc') {
        readout.appendChild(htmlEl('span', {}, 'phase 1: prepare (vote)'));
        readout.appendChild(htmlEl('span', {}, 'phase 2: commit/abort'));
        readout.appendChild(htmlEl('span', {}, 'lock duration: entire transaction'));
      } else {
        readout.appendChild(htmlEl('span', {}, 'each step commits locally'));
        readout.appendChild(htmlEl('span', {}, 'failure → run compensations in reverse'));
        readout.appendChild(htmlEl('span', {}, 'eventual consistency, no global locks'));
      }
    }

    function play(): void {
      clearTimers();
      draw();
      const xs = [100, 210, 320, 430];
      xs.forEach((x, i) => {
        schedule(() => {
          const c = svgEl('circle', { cx: x, cy: 130, r: 8, fill: token('--anim-success') });
          svg.appendChild(c);
          schedule(() => c.setAttribute('fill', token('--anim-sorted')), 200);
        }, i * 500);
      });

      if (mode === 'saga') {
        schedule(() => {
          svg.appendChild(svgEl('circle', { cx: xs[2]!, cy: 130, r: 12, fill: token('--anim-danger') }));
          [1, 0].forEach((idx, k) => {
            schedule(() => {
              svg.appendChild(svgEl('circle', { cx: xs[idx]!, cy: 160, r: 8, fill: token('--anim-danger') }));
              const t = svgEl('text', {
                x: xs[idx]!,
                y: 180,
                'text-anchor': 'middle',
                fill: token('--anim-danger'),
                'font-size': 10,
                'font-family': 'JetBrains Mono, monospace',
              });
              t.textContent = 'compensate';
              svg.appendChild(t);
            }, k * 500 + 400);
          });
        }, 1700);
      }
    }

    const modeBtns: HTMLButtonElement[] = [];
    const sagaBtn = makeBtn('saga', () => {
      mode = 'saga';
      for (const b of modeBtns) b.setAttribute('aria-pressed', String(b === sagaBtn));
      draw();
    });
    sagaBtn.setAttribute('aria-pressed', 'true');
    modeBtns.push(sagaBtn);
    controls.appendChild(sagaBtn);

    const twoPcBtn = makeBtn('2PC', () => {
      mode = '2pc';
      for (const b of modeBtns) b.setAttribute('aria-pressed', String(b === twoPcBtn));
      draw();
    });
    twoPcBtn.setAttribute('aria-pressed', 'false');
    modeBtns.push(twoPcBtn);
    controls.appendChild(twoPcBtn);

    controls.appendChild(makeBtn('▶ play scenario', play, { primary: true }));

    const offTheme = onThemeChange(() => draw());
    draw();

    return {
      pause(): void {
        paused = true;
        clearTimers();
      },
      resume(): void {
        paused = false;
      },
      reset(): void {
        clearTimers();
        paused = false;
        mode = 'saga';
        sagaBtn.setAttribute('aria-pressed', 'true');
        twoPcBtn.setAttribute('aria-pressed', 'false');
        draw();
      },
      destroy(): void {
        paused = true;
        clearTimers();
        offTheme();
        host.innerHTML = '';
      },
    };
  },
};

export default saga;
