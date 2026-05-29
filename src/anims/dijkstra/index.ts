import type { AnimModule, AnimHandle } from '~/lib/anim/types';
import { buildFrame, svgEl, htmlEl, makeBtn } from '~/lib/anim/svg';
import { token, onThemeChange } from '~/lib/anim/theme';
import { prefersReducedMotion } from '~/lib/anim/a11y';
import meta from './meta';

const NODES = [
  { i: 0, x: 90, y: 50 },
  { i: 1, x: 240, y: 50 },
  { i: 2, x: 390, y: 50 },
  { i: 3, x: 90, y: 130 },
  { i: 4, x: 240, y: 130 },
  { i: 5, x: 390, y: 130 },
  { i: 6, x: 90, y: 210 },
  { i: 7, x: 240, y: 210 },
  { i: 8, x: 390, y: 210 },
];
// Weighted edges — same topology as bfs/dfs, weights assigned to make
// non-direct paths sometimes win.
const EDGES: Array<[number, number, number]> = [
  [0, 1, 4], [1, 2, 8], [0, 3, 3], [1, 4, 2], [2, 5, 1],
  [3, 4, 5], [4, 5, 6], [3, 6, 2], [4, 7, 7], [5, 8, 3],
  [6, 7, 4], [7, 8, 2],
];

const INF = Number.POSITIVE_INFINITY;

type NodeState = 'unvisited' | 'frontier' | 'current' | 'finalized';

interface Step {
  states: NodeState[];
  dist: number[];
  current: number;
  relaxEdge: [number, number] | null;
  note: string;
}

const dijkstra: AnimModule = {
  ...meta,

  mount(host): AnimHandle {
    const { stage, controls, readout } = buildFrame(host, {
      title: meta.title,
      caption: meta.caption,
      badge: 'Interactive',
    });

    const SIZE_W = 480;
    const SIZE_H = 280;
    const svg = svgEl('svg', {
      viewBox: `0 0 ${SIZE_W} ${SIZE_H}`,
      width: SIZE_W,
      style: 'max-width:100%;height:auto;',
    });
    stage.appendChild(svg);

    let start = 0;
    let speed = 1;
    let paused = false;
    let runToken = 0;
    let steps: Step[] = [];
    let cursor = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    function clearTimer(): void {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    }

    function neighbors(i: number): Array<{ v: number; w: number }> {
      const out: Array<{ v: number; w: number }> = [];
      for (const [a, b, w] of EDGES) {
        if (a === i) out.push({ v: b, w });
        else if (b === i) out.push({ v: a, w });
      }
      return out;
    }

    function genSteps(): void {
      const states: NodeState[] = NODES.map(() => 'unvisited');
      const dist: number[] = NODES.map(() => INF);
      dist[start] = 0;
      states[start] = 'frontier';
      const finalized = new Set<number>();
      steps = [];
      const push = (current: number, relaxEdge: [number, number] | null, note: string): void => {
        steps.push({
          states: [...states],
          dist: [...dist],
          current,
          relaxEdge,
          note,
        });
      };
      push(-1, null, `init: dist[${start}]=0, others=∞`);

      while (finalized.size < NODES.length) {
        // Extract min over unfinalized
        let u = -1;
        let best = INF;
        for (let i = 0; i < NODES.length; i++) {
          if (!finalized.has(i) && dist[i]! < best) {
            best = dist[i]!;
            u = i;
          }
        }
        if (u === -1) break; // disconnected
        states[u] = 'current';
        push(u, null, `extract-min: ${u} (dist=${dist[u]})`);

        for (const { v, w } of neighbors(u)) {
          if (finalized.has(v)) continue;
          const alt = dist[u]! + w;
          if (alt < dist[v]!) {
            dist[v] = alt;
            if (states[v] === 'unvisited') states[v] = 'frontier';
            push(u, [u, v], `relax ${u}→${v}: ${alt} < ${alt === w + dist[u]! ? '∞ or older' : dist[v]}`);
          } else {
            push(u, [u, v], `relax ${u}→${v}: ${alt} ≥ ${dist[v]} (skip)`);
          }
        }
        states[u] = 'finalized';
        finalized.add(u);
        push(-1, null, `finalize ${u}`);
      }
      push(-1, null, 'done');
    }

    function colorFor(state: NodeState): string {
      switch (state) {
        case 'unvisited': return token('--anim-bar-bg');
        case 'frontier': return token('--anim-highlight');
        case 'current': return token('--anim-pivot');
        case 'finalized': return token('--anim-sorted');
      }
    }

    function draw(): void {
      svg.innerHTML = '';
      const s = steps[cursor];
      if (!s) return;

      for (const [a, b, w] of EDGES) {
        const na = NODES[a]!;
        const nb = NODES[b]!;
        const isRelax =
          s.relaxEdge !== null &&
          ((s.relaxEdge[0] === a && s.relaxEdge[1] === b) ||
            (s.relaxEdge[0] === b && s.relaxEdge[1] === a));
        svg.appendChild(
          svgEl('line', {
            x1: na.x,
            y1: na.y,
            x2: nb.x,
            y2: nb.y,
            stroke: isRelax ? token('--anim-pivot') : token('--anim-edge-idle'),
            'stroke-width': isRelax ? 2.5 : 1.5,
            opacity: isRelax ? 0.95 : 0.4,
          }),
        );
        const lblX = (na.x + nb.x) / 2;
        const lblY = (na.y + nb.y) / 2 - 4;
        const lbl = svgEl('text', {
          x: lblX,
          y: lblY,
          'text-anchor': 'middle',
          fill: isRelax ? token('--anim-pivot') : token('--anim-text-muted'),
          'font-size': 10,
          'font-family': 'JetBrains Mono, monospace',
        });
        lbl.textContent = String(w);
        svg.appendChild(lbl);
      }

      for (const n of NODES) {
        const state = s.states[n.i]!;
        svg.appendChild(svgEl('circle', { cx: n.x, cy: n.y, r: 18, fill: colorFor(state) }));
        const lbl = svgEl('text', {
          x: n.x,
          y: n.y + 5,
          'text-anchor': 'middle',
          fill: state === 'unvisited' ? token('--anim-text-muted') : '#0a0a14',
          'font-size': 13,
          'font-weight': 700,
          'font-family': 'JetBrains Mono, monospace',
        });
        lbl.textContent = String(n.i);
        svg.appendChild(lbl);
        // Distance label
        const distLbl = svgEl('text', {
          x: n.x,
          y: n.y + 36,
          'text-anchor': 'middle',
          fill: state === 'unvisited' ? token('--anim-text-muted') : token('--anim-text'),
          'font-size': 11,
          'font-weight': 600,
          'font-family': 'JetBrains Mono, monospace',
        });
        distLbl.textContent = s.dist[n.i] === INF ? '∞' : String(s.dist[n.i]);
        svg.appendChild(distLbl);
      }

      const note = svgEl('text', {
        x: 18,
        y: 24,
        fill: token('--anim-text-muted'),
        'font-size': 12,
        'font-family': 'JetBrains Mono, monospace',
      });
      note.textContent = s.note;
      svg.appendChild(note);

      readout.innerHTML = '';
      readout.appendChild(htmlEl('span', {}, `step: ${cursor + 1} / ${steps.length}`));
      const distArr = s.dist.map((d, i) => `${i}:${d === INF ? '∞' : d}`).join(' ');
      readout.appendChild(htmlEl('span', {}, `dist = ${distArr}`));
      readout.appendChild(htmlEl('span', {}, `start: ${start}`));
    }

    function tick(): void {
      if (paused) return;
      if (cursor >= steps.length - 1) {
        clearTimer();
        return;
      }
      cursor++;
      draw();
      timer = setTimeout(tick, Math.max(80, 420 / speed));
    }

    function play(): void {
      const myRun = ++runToken;
      paused = false;
      clearTimer();
      if (prefersReducedMotion()) {
        cursor = steps.length - 1;
        draw();
        return;
      }
      const loop = (): void => {
        if (myRun !== runToken) return;
        tick();
      };
      loop();
    }

    function stepOne(): void {
      paused = true;
      clearTimer();
      if (cursor < steps.length - 1) cursor++;
      draw();
    }

    function reset(): void {
      runToken++;
      paused = true;
      clearTimer();
      genSteps();
      cursor = 0;
      draw();
    }

    function cycleStart(): void {
      start = (start + 1) % NODES.length;
      reset();
    }

    controls.appendChild(makeBtn('play', play, { primary: true }));
    controls.appendChild(makeBtn('step', stepOne));
    controls.appendChild(makeBtn('reset', reset));
    controls.appendChild(makeBtn('cycle start', cycleStart));

    const offTheme = onThemeChange(() => draw());
    genSteps();
    cursor = 0;
    draw();

    return {
      pause(): void {
        paused = true;
        clearTimer();
      },
      resume(): void {
        /* user clicks play */
      },
      reset,
      destroy(): void {
        runToken++;
        clearTimer();
        offTheme();
        host.innerHTML = '';
      },
    };
  },
};

export default dijkstra;
