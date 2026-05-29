import type { AnimModule, AnimHandle } from '~/lib/anim/types';
import { buildFrame, svgEl, htmlEl, makeBtn, hash32 } from '~/lib/anim/svg';
import { token, onThemeChange } from '~/lib/anim/theme';
import meta from './meta';

// Ported from Brain-Detox-arc/docs/javascripts/animations.js:1184-1248.
type Strategy = 'range' | 'hash' | 'geo';

interface Key {
  user: number;
  k: string;
}

const sharding: AnimModule = {
  ...meta,

  mount(host): AnimHandle {
    const { stage, controls, readout } = buildFrame(host, {
      title: meta.title,
      caption: meta.caption,
      badge: 'Interactive',
    });

    const svg = svgEl('svg', {
      viewBox: '0 0 480 230',
      width: 480,
      style: 'max-width:100%;height:auto;',
    });
    stage.appendChild(svg);

    const keys: Key[] = [];
    for (let i = 0; i < 24; i++) {
      if (i < 8) keys.push({ user: 5, k: `u5:${i}` });
      else keys.push({ user: 10 + i, k: `u${10 + i}:a` });
    }

    let strategy: Strategy = 'range';
    const stratBtns: HTMLButtonElement[] = [];

    function shardOf(k: Key): number {
      if (strategy === 'range') return Math.min(3, Math.floor(k.user / 10));
      if (strategy === 'hash') return hash32(k.k) % 4;
      return k.user % 4;
    }

    function draw(): void {
      svg.innerHTML = '';
      const shards: Key[][] = [[], [], [], []];
      for (const k of keys) shards[shardOf(k)]!.push(k);

      for (let s = 0; s < 4; s++) {
        const x = 30 + s * 110;
        svg.appendChild(
          svgEl('rect', {
            x,
            y: 60,
            width: 100,
            height: 130,
            rx: 8,
            fill: token('--anim-bar-bg'),
            stroke: token('--anim-edge-idle'),
          }),
        );
        const lbl = svgEl('text', {
          x: x + 50,
          y: 50,
          'text-anchor': 'middle',
          fill: token('--anim-text'),
          'font-size': 12,
          'font-weight': 600,
        });
        lbl.textContent = `shard ${s}`;
        svg.appendChild(lbl);

        shards[s]!.forEach((k, i) => {
          const col = i % 4;
          const row = Math.floor(i / 4);
          const cx = x + 12 + col * 22;
          const cy = 75 + row * 22;
          const hot = k.user === 5;
          svg.appendChild(
            svgEl('circle', {
              cx,
              cy,
              r: 8,
              fill: hot ? token('--anim-danger') : token('--anim-compare'),
              opacity: 0.9,
            }),
          );
        });

        const cl = svgEl('text', {
          x: x + 50,
          y: 215,
          'text-anchor': 'middle',
          fill: token('--anim-text-muted'),
          'font-size': 11,
          'font-family': 'JetBrains Mono, monospace',
        });
        cl.textContent = `${shards[s]!.length} keys`;
        svg.appendChild(cl);
      }

      const counts = shards.map((s) => s.length);
      const max = Math.max(...counts);
      const min = Math.min(...counts);
      readout.innerHTML = '';
      readout.appendChild(htmlEl('span', {}, `strategy: ${strategy}`));
      readout.appendChild(htmlEl('span', {}, `max shard: ${max}`));
      readout.appendChild(htmlEl('span', {}, `min shard: ${min}`));
      readout.appendChild(htmlEl('span', {}, `skew: ${max - min}`));
    }

    (['range', 'hash', 'geo'] as Strategy[]).forEach((s) => {
      const btn = makeBtn(s, () => {
        strategy = s;
        for (const b of stratBtns) b.setAttribute('aria-pressed', String(b === btn));
        draw();
      });
      btn.setAttribute('aria-pressed', String(s === strategy));
      stratBtns.push(btn);
      controls.appendChild(btn);
    });

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
        strategy = 'range';
        for (const b of stratBtns) b.setAttribute('aria-pressed', String(b.textContent === 'range'));
        draw();
      },
      destroy(): void {
        offTheme();
        host.innerHTML = '';
      },
    };
  },
};

export default sharding;
