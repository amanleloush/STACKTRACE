import type { AnimModule, AnimHandle } from '~/lib/anim/types';
import { buildFrame, svgEl, htmlEl, makeBtn } from '~/lib/anim/svg';
import { token, onThemeChange } from '~/lib/anim/theme';
import { prefersReducedMotion } from '~/lib/anim/a11y';
import meta from './meta';

// Shared 3×3 grid graph reused by bfs/dfs/dijkstra (same topology, different
// algorithms make the comparison meaningful).
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
const EDGES: Array<[number, number]> = [
  [0, 1], [1, 2], [0, 3], [1, 4], [2, 5],
  [3, 4], [4, 5], [3, 6], [4, 7], [5, 8],
  [6, 7], [7, 8],
];

type NodeState = 'unvisited' | 'queued' | 'current' | 'visited';

interface Step {
  states: NodeState[];
  queue: number[];
  current: number;
  visited: number[];
  note: string;
}

const bfs: AnimModule = {
  ...meta,

  mount(host): AnimHandle {
    const { stage, controls, readout } = buildFrame(host, {
      title: meta.title,
      caption: meta.caption,
      badge: 'Interactive',
    });

    const SIZE_W = 480;
    const SIZE_H = 260;
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

    function adj(i: number): number[] {
      const out: number[] = [];
      for (const [a, b] of EDGES) {
        if (a === i) out.push(b);
        else if (b === i) out.push(a);
      }
      return out.sort((a, b) => a - b);
    }

    function genSteps(): void {
      const states: NodeState[] = NODES.map(() => 'unvisited');
      const visited: number[] = [];
      const queue: number[] = [start];
      const enqueued = new Set<number>([start]);
      states[start] = 'queued';
      steps = [];
      const push = (current: number, note: string): void => {
        steps.push({
          states: [...states],
          queue: [...queue],
          current,
          visited: [...visited],
          note,
        });
      };
      push(-1, `init: enqueue start ${start}`);
      while (queue.length > 0) {
        const u = queue.shift()!;
        states[u] = 'current';
        push(u, `dequeue ${u}`);
        for (const v of adj(u)) {
          if (!enqueued.has(v)) {
            enqueued.add(v);
            queue.push(v);
            states[v] = 'queued';
            push(u, `enqueue neighbor ${v}`);
          }
        }
        states[u] = 'visited';
        visited.push(u);
        push(-1, `mark ${u} visited`);
      }
      push(-1, 'done');
    }

    function colorFor(state: NodeState): string {
      switch (state) {
        case 'unvisited': return token('--anim-bar-bg');
        case 'queued': return token('--anim-highlight');
        case 'current': return token('--anim-pivot');
        case 'visited': return token('--anim-sorted');
      }
    }

    function draw(): void {
      svg.innerHTML = '';
      const s = steps[cursor];
      if (!s) return;

      // Edges
      for (const [a, b] of EDGES) {
        const na = NODES[a]!;
        const nb = NODES[b]!;
        const active = s.current === a || s.current === b;
        svg.appendChild(
          svgEl('line', {
            x1: na.x,
            y1: na.y,
            x2: nb.x,
            y2: nb.y,
            stroke: active ? token('--anim-pivot') : token('--anim-edge-idle'),
            'stroke-width': active ? 2.5 : 1.5,
            opacity: active ? 0.9 : 0.5,
          }),
        );
      }

      // Nodes
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
      readout.appendChild(htmlEl('span', {}, `queue: [${s.queue.join(', ')}]`));
      readout.appendChild(htmlEl('span', {}, `visited: [${s.visited.join(', ')}]`));
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
      timer = setTimeout(tick, Math.max(60, 360 / speed));
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

export default bfs;
