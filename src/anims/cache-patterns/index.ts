import type { AnimModule, AnimHandle } from '~/lib/anim/types';
import { buildFrame, svgEl, htmlEl, makeBtn } from '~/lib/anim/svg';
import { token, onThemeChange } from '~/lib/anim/theme';
import meta from './meta';

// Ported from Brain-Detox-arc/docs/javascripts/animations.js:743-845.
type Mode = 'aside' | 'through' | 'back' | 'around';

const MODE_TITLE: Record<Mode, string> = {
  aside: 'Cache-aside (lazy load)',
  through: 'Read-through / Write-through',
  back: 'Write-back (write-behind)',
  around: 'Write-around',
};

const MODE_NOTES: Record<Mode, string[]> = {
  aside: [
    'App talks to cache and DB',
    'App is responsible for filling cache on miss',
    'Risk: stale entries if writes bypass cache',
  ],
  through: [
    'App talks only to cache',
    'Cache itself fetches from / writes to DB',
    'Higher latency on writes, simpler app code',
  ],
  back: [
    'Writes go to cache, ack immediately',
    'Cache flushes to DB asynchronously',
    'Highest perf, risk of data loss on cache crash',
  ],
  around: [
    'Writes go straight to DB, bypass cache',
    'Reads still cache-aside',
    'Good for write-heavy + read-rare keys',
  ],
};

interface Step {
  from: [number, number];
  to: [number, number];
  label: string;
}

const MODE_STEPS: Record<Mode, Step[]> = {
  aside: [
    { from: [120, 125], to: [195, 55], label: '1: get' },
    { from: [240, 80], to: [120, 125], label: '2: miss' },
    { from: [120, 125], to: [360, 195], label: '3: read' },
    { from: [360, 195], to: [120, 125], label: '4: row' },
    { from: [120, 125], to: [195, 55], label: '5: set' },
  ],
  through: [
    { from: [120, 125], to: [240, 55], label: '1: get' },
    { from: [240, 80], to: [360, 195], label: '2: load if miss' },
    { from: [360, 195], to: [240, 80], label: '3: row' },
    { from: [240, 55], to: [120, 125], label: '4: value' },
  ],
  back: [
    { from: [120, 125], to: [240, 55], label: '1: write' },
    { from: [240, 55], to: [120, 125], label: '2: ack' },
    { from: [240, 80], to: [360, 195], label: '3: async flush' },
  ],
  around: [
    { from: [120, 125], to: [405, 195], label: '1: write' },
    { from: [405, 195], to: [120, 125], label: '2: ack' },
    { from: [120, 125], to: [240, 55], label: 'later: read' },
    { from: [240, 80], to: [360, 195], label: 'load' },
  ],
};

const cachePatterns: AnimModule = {
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

    let mode: Mode = 'aside';
    let paused = false;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const rafIds = new Set<number>();
    function clearTimers(): void {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
      rafIds.forEach((id) => cancelAnimationFrame(id));
      rafIds.clear();
    }

    function draw(): void {
      svg.innerHTML = '';
      const boxes = [
        { x: 30, y: 100, w: 90, h: 50, label: 'App', tok: '--anim-compare' as const },
        { x: 195, y: 30, w: 90, h: 50, label: 'Cache', tok: '--anim-pivot' as const },
        { x: 360, y: 170, w: 90, h: 50, label: 'DB', tok: '--anim-node-leader' as const },
      ];
      for (const b of boxes) {
        svg.appendChild(
          svgEl('rect', { x: b.x, y: b.y, width: b.w, height: b.h, rx: 8, fill: token(b.tok) }),
        );
        const t = svgEl('text', {
          x: b.x + b.w / 2,
          y: b.y + b.h / 2 + 5,
          'text-anchor': 'middle',
          fill: '#fff',
          'font-size': 13,
          'font-weight': 700,
        });
        t.textContent = b.label;
        svg.appendChild(t);
      }
      const title = svgEl('text', {
        x: 240,
        y: 220,
        'text-anchor': 'middle',
        fill: token('--anim-text'),
        'font-size': 13,
        'font-weight': 600,
      });
      title.textContent = MODE_TITLE[mode];
      svg.appendChild(title);

      readout.innerHTML = '';
      for (const line of MODE_NOTES[mode]) readout.appendChild(htmlEl('span', {}, line));
    }

    function playFlow(): void {
      if (paused) return;
      const steps = MODE_STEPS[mode];
      steps.forEach((p, idx) => {
        const t0 = setTimeout(() => {
          timers.delete(t0);
          if (paused) return;
          const dot = svgEl('circle', {
            cx: p.from[0],
            cy: p.from[1],
            r: 6,
            fill: token('--anim-highlight'),
          });
          svg.appendChild(dot);
          const lbl = svgEl('text', {
            x: (p.from[0] + p.to[0]) / 2,
            y: (p.from[1] + p.to[1]) / 2 - 6,
            'text-anchor': 'middle',
            fill: token('--anim-text-muted'),
            'font-size': 10,
            'font-family': 'JetBrains Mono, monospace',
          });
          lbl.textContent = p.label;
          svg.appendChild(lbl);
          const start = performance.now();
          const step = (t: number): void => {
            if (paused) {
              dot.remove();
              lbl.remove();
              return;
            }
            const u = Math.min(1, (t - start) / 700);
            dot.setAttribute('cx', String(p.from[0] + (p.to[0] - p.from[0]) * u));
            dot.setAttribute('cy', String(p.from[1] + (p.to[1] - p.from[1]) * u));
            if (u < 1) {
              const id = requestAnimationFrame(step);
              rafIds.add(id);
            } else {
              const cleanup = setTimeout(() => {
                timers.delete(cleanup);
                dot.remove();
                lbl.remove();
              }, 400);
              timers.add(cleanup);
            }
          };
          const id = requestAnimationFrame(step);
          rafIds.add(id);
        }, idx * 900);
        timers.add(t0);
      });
    }

    const modeButtons: HTMLButtonElement[] = [];
    (['aside', 'through', 'back', 'around'] as Mode[]).forEach((m) => {
      const btn = makeBtn(m, () => {
        mode = m;
        for (const b of modeButtons) b.setAttribute('aria-pressed', String(b === btn));
        draw();
      });
      btn.setAttribute('aria-pressed', String(m === mode));
      modeButtons.push(btn);
      controls.appendChild(btn);
    });
    controls.appendChild(makeBtn('▶ play flow', playFlow, { primary: true }));

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
        mode = 'aside';
        for (const b of modeButtons) b.setAttribute('aria-pressed', String(b.textContent === 'aside'));
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

export default cachePatterns;
