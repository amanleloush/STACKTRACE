import type { AnimModule, AnimHandle } from '~/lib/anim/types';
import { buildFrame, svgEl, htmlEl, makeBtn } from '~/lib/anim/svg';
import { token, onThemeChange } from '~/lib/anim/theme';
import meta from './meta';

// Ported from Brain-Detox-arc/docs/javascripts/animations.js:535-649.
const NODE_TOKENS = [
  '--anim-compare',
  '--anim-pivot',
  '--anim-highlight',
  '--anim-success',
] as const;

const kafka: AnimModule = {
  ...meta,

  mount(host): AnimHandle {
    const { stage, controls, readout } = buildFrame(host, {
      title: meta.title,
      caption: meta.caption,
      badge: 'Interactive',
    });

    const svg = svgEl('svg', {
      viewBox: '0 0 480 240',
      width: 480,
      style: 'max-width:100%;height:auto;',
    });
    stage.appendChild(svg);

    const PARTITIONS = 4;
    let consumers = 3;
    let produced = 0;
    let consumed = 0;
    let paused = false;

    const timers = new Set<ReturnType<typeof setTimeout>>();
    const rafIds = new Set<number>();
    function clearTimers(): void {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
      rafIds.forEach((id) => cancelAnimationFrame(id));
      rafIds.clear();
    }

    function assign(): Record<number, number> {
      const map: Record<number, number> = {};
      for (let p = 0; p < PARTITIONS; p++) map[p] = p % consumers;
      return map;
    }

    function draw(): void {
      svg.innerHTML = '';
      // Producer
      svg.appendChild(svgEl('rect', { x: 20, y: 90, width: 80, height: 50, rx: 8, fill: token('--anim-pivot') }));
      const pt = svgEl('text', {
        x: 60,
        y: 122,
        'text-anchor': 'middle',
        fill: '#fff',
        'font-size': 12,
        'font-weight': 600,
      });
      pt.textContent = 'Producer';
      svg.appendChild(pt);

      // Partitions
      for (let p = 0; p < PARTITIONS; p++) {
        const y = 20 + p * 50;
        svg.appendChild(
          svgEl('rect', {
            x: 170,
            y,
            width: 130,
            height: 38,
            rx: 6,
            fill: token('--anim-bar-bg'),
            stroke: token('--anim-edge-idle'),
          }),
        );
        const lbl = svgEl('text', {
          x: 175,
          y: y + 22,
          fill: token('--anim-text-muted'),
          'font-size': 11,
          'font-family': 'JetBrains Mono, monospace',
        });
        lbl.textContent = `partition ${p}`;
        svg.appendChild(lbl);
        // Offset markers
        for (let o = 0; o < 6; o++) {
          svg.appendChild(
            svgEl('rect', {
              x: 250 + o * 8,
              y: y + 12,
              width: 6,
              height: 14,
              rx: 1.5,
              fill: token(NODE_TOKENS[p % NODE_TOKENS.length]!),
              opacity: 0.6,
            }),
          );
        }
      }

      // Consumers
      const map = assign();
      for (let c = 0; c < consumers; c++) {
        const y = 30 + c * (180 / consumers);
        const colorToken = NODE_TOKENS[c % NODE_TOKENS.length]!;
        svg.appendChild(
          svgEl('rect', { x: 370, y, width: 90, height: 40, rx: 8, fill: token(colorToken) }),
        );
        const txt = svgEl('text', {
          x: 415,
          y: y + 24,
          'text-anchor': 'middle',
          fill: '#0a0a14',
          'font-size': 12,
          'font-weight': 700,
        });
        txt.textContent = `C${c}`;
        svg.appendChild(txt);
        // Connect partition → consumer
        for (let p = 0; p < PARTITIONS; p++) {
          if (map[p] === c) {
            const px = 300;
            const py = 20 + p * 50 + 19;
            const cx2 = 370;
            const cy2 = y + 20;
            svg.appendChild(
              svgEl('path', {
                d: `M${px} ${py} C${(px + cx2) / 2} ${py} ${(px + cx2) / 2} ${cy2} ${cx2} ${cy2}`,
                stroke: token(colorToken),
                'stroke-width': 1.5,
                fill: 'none',
                opacity: 0.7,
              }),
            );
          }
        }
      }

      readout.innerHTML = '';
      readout.appendChild(htmlEl('span', {}, `partitions: ${PARTITIONS}`));
      readout.appendChild(htmlEl('span', {}, `consumers: ${consumers}`));
      readout.appendChild(htmlEl('span', {}, `produced: ${produced}`));
      readout.appendChild(htmlEl('span', {}, `consumed: ${consumed}`));
    }

    function send(): void {
      if (paused) return;
      const p = Math.floor(Math.random() * PARTITIONS);
      const dot = svgEl('circle', {
        cx: 100,
        cy: 115,
        r: 6,
        fill: token(NODE_TOKENS[p % NODE_TOKENS.length]!),
      });
      svg.appendChild(dot);
      const targetX = 235;
      const targetY = 20 + p * 50 + 19;
      const start = performance.now();
      const step = (t: number): void => {
        if (paused) {
          dot.remove();
          return;
        }
        const u = Math.min(1, (t - start) / 600);
        dot.setAttribute('cx', String(100 + (targetX - 100) * u));
        dot.setAttribute('cy', String(115 + (targetY - 115) * u));
        if (u < 1) {
          const id = requestAnimationFrame(step);
          rafIds.add(id);
        } else {
          produced++;
          const c = p % consumers;
          const cx2 = 415;
          const cy2 = 30 + c * (180 / consumers) + 20;
          const s2 = performance.now();
          const step2 = (t2: number): void => {
            if (paused) {
              dot.remove();
              return;
            }
            const u2 = Math.min(1, (t2 - s2) / 600);
            dot.setAttribute('cx', String(targetX + (cx2 - targetX) * u2));
            dot.setAttribute('cy', String(targetY + (cy2 - targetY) * u2));
            dot.setAttribute('opacity', String(1 - u2 * 0.8));
            if (u2 < 1) {
              const id2 = requestAnimationFrame(step2);
              rafIds.add(id2);
            } else {
              consumed++;
              dot.remove();
              draw();
            }
          };
          const id2 = requestAnimationFrame(step2);
          rafIds.add(id2);
          draw();
        }
      };
      const id = requestAnimationFrame(step);
      rafIds.add(id);
    }

    controls.appendChild(makeBtn('publish 1', send, { primary: true }));
    controls.appendChild(
      makeBtn('publish burst', () => {
        for (let i = 0; i < 8; i++) {
          const t = setTimeout(() => {
            timers.delete(t);
            send();
          }, i * 120);
          timers.add(t);
        }
      }),
    );
    controls.appendChild(
      makeBtn('+ consumer', () => {
        if (consumers < PARTITIONS) {
          consumers++;
          draw();
        }
      }),
    );
    controls.appendChild(
      makeBtn('– consumer (rebalance)', () => {
        if (consumers > 1) {
          consumers--;
          draw();
        }
      }),
    );

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
        consumers = 3;
        produced = 0;
        consumed = 0;
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

export default kafka;
