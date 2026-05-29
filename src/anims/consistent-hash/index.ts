import type { AnimModule, AnimHandle } from '~/lib/anim/types';
import { buildFrame, svgEl, htmlEl, makeBtn, hash32 } from '~/lib/anim/svg';
import { token, onThemeChange } from '~/lib/anim/theme';
import meta from './meta';

// Ported from Brain-Detox-Arc/docs/javascripts/animations.js:67-235.
// PALETTE hexes replaced with semantic theme tokens so dark/light both render.
const NODE_TOKENS = [
  '--anim-compare',
  '--anim-pivot',
  '--anim-highlight',
  '--anim-success',
  '--anim-danger',
  '--anim-node-candidate',
] as const;

const consistentHash: AnimModule = {
  ...meta,

  mount(host): AnimHandle {
    const { stage, controls, readout } = buildFrame(host, {
      title: meta.title,
      caption: meta.caption,
      badge: 'Interactive',
    });

    const SIZE = 460;
    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const rRing = 170;

    const svg = svgEl('svg', {
      viewBox: `0 0 ${SIZE} ${SIZE}`,
      width: SIZE,
      style: 'max-width:100%;height:auto;',
    });
    stage.appendChild(svg);

    interface State {
      nodes: string[];
      replicas: number;
      keys: string[];
    }
    const state: State = {
      nodes: ['alpha', 'bravo', 'charlie'],
      replicas: 6,
      keys: ['user:42', 'cart:7', 'session:91', 'obj:120', 'tag:99', 'row:55', 'post:3', 'img:200'],
    };

    const angleOf = (label: string): number => ((hash32(label) % 360) * Math.PI) / 180;
    const pointOnRing = (angle: number, r: number): [number, number] => [
      cx + Math.sin(angle) * r,
      cy - Math.cos(angle) * r,
    ];

    interface VNode {
      node: string;
      replica: number;
      label: string;
      angle: number;
      tokenName: string;
    }
    function vnodePositions(): VNode[] {
      const all: VNode[] = [];
      state.nodes.forEach((n, idx) => {
        for (let r = 0; r < state.replicas; r++) {
          const label = `${n}#${r}`;
          all.push({
            node: n,
            replica: r,
            label,
            angle: angleOf(label),
            tokenName: NODE_TOKENS[idx % NODE_TOKENS.length]!,
          });
        }
      });
      return all.sort((a, b) => a.angle - b.angle);
    }
    function nearestNode(keyAngle: number, vnodes: VNode[]): VNode {
      for (const v of vnodes) if (v.angle >= keyAngle) return v;
      return vnodes[0]!;
    }

    function draw(): void {
      svg.innerHTML = '';

      // Ring track
      svg.appendChild(
        svgEl('circle', {
          cx,
          cy,
          r: rRing,
          fill: 'none',
          stroke: token('--anim-edge-idle'),
          'stroke-width': 1,
          'stroke-dasharray': '4 6',
          opacity: 0.6,
        }),
      );

      const vnodes = vnodePositions();

      // Virtual nodes (small)
      vnodes.forEach((v) => {
        const [x, y] = pointOnRing(v.angle, rRing);
        svg.appendChild(svgEl('circle', { cx: x, cy: y, r: 5, fill: token(v.tokenName) }));
      });

      // Primary node labels — placed at the first replica's angle.
      state.nodes.forEach((n, idx) => {
        const v0 = vnodes.find((v) => v.node === n);
        if (!v0) return;
        const [x, y] = pointOnRing(v0.angle, rRing + 26);
        const lbl = svgEl('text', {
          x,
          y,
          'text-anchor': 'middle',
          'dominant-baseline': 'middle',
          fill: token(NODE_TOKENS[idx % NODE_TOKENS.length]!),
          'font-family': 'JetBrains Mono, monospace',
          'font-size': 12,
          'font-weight': 600,
        });
        lbl.textContent = n;
        svg.appendChild(lbl);
      });

      // Keys
      state.keys.forEach((k) => {
        const a = angleOf(k);
        const owner = nearestNode(a, vnodes);
        const [kx, ky] = pointOnRing(a, rRing - 36);
        const [ox, oy] = pointOnRing(owner.angle, rRing);
        svg.appendChild(
          svgEl('line', {
            x1: kx,
            y1: ky,
            x2: ox,
            y2: oy,
            stroke: token(owner.tokenName),
            'stroke-width': 1,
            opacity: 0.5,
          }),
        );
        svg.appendChild(
          svgEl('circle', {
            cx: kx,
            cy: ky,
            r: 6,
            fill: token('--anim-highlight'),
            stroke: token(owner.tokenName),
            'stroke-width': 1.5,
          }),
        );
        const t = svgEl('text', {
          x: kx,
          y: ky - 12,
          'text-anchor': 'middle',
          fill: token('--anim-text-muted'),
          'font-size': 10,
          'font-family': 'JetBrains Mono, monospace',
        });
        t.textContent = k;
        svg.appendChild(t);
      });

      readout.innerHTML = '';
      readout.appendChild(htmlEl('span', {}, `${state.nodes.length} nodes`));
      readout.appendChild(htmlEl('span', {}, `${state.replicas} v-nodes each`));
      readout.appendChild(htmlEl('span', {}, `${state.keys.length} keys placed`));
      readout.appendChild(
        htmlEl(
          'span',
          {},
          `re-route on remove: ~${(100 / state.nodes.length).toFixed(0)}%`,
        ),
      );
    }

    const EXTRA_NAMES = ['delta', 'echo', 'foxtrot', 'golf', 'hotel'];
    let counter = 0;
    controls.appendChild(
      makeBtn(
        '+ add node',
        () => {
          if (state.nodes.length >= 6) return;
          const name = EXTRA_NAMES[counter++] ?? `node${state.nodes.length + 1}`;
          state.nodes.push(name);
          draw();
        },
        { primary: true },
      ),
    );
    controls.appendChild(
      makeBtn('– remove node', () => {
        if (state.nodes.length <= 2) return;
        state.nodes.pop();
        draw();
      }),
    );
    controls.appendChild(
      makeBtn('shuffle keys', () => {
        state.keys = state.keys.map(() => `k:${Math.floor(Math.random() * 9999)}`);
        draw();
      }),
    );
    controls.appendChild(
      makeBtn('more v-nodes', () => {
        state.replicas = Math.min(20, state.replicas + 2);
        draw();
      }),
    );
    controls.appendChild(
      makeBtn('fewer v-nodes', () => {
        state.replicas = Math.max(2, state.replicas - 2);
        draw();
      }),
    );

    const offTheme = onThemeChange(() => draw());
    draw();

    return {
      pause(): void {
        /* static — nothing to pause */
      },
      resume(): void {
        /* static */
      },
      reset(): void {
        state.nodes = ['alpha', 'bravo', 'charlie'];
        state.replicas = 6;
        state.keys = ['user:42', 'cart:7', 'session:91', 'obj:120', 'tag:99', 'row:55', 'post:3', 'img:200'];
        counter = 0;
        draw();
      },
      destroy(): void {
        offTheme();
        host.innerHTML = '';
      },
    };
  },
};

export default consistentHash;
