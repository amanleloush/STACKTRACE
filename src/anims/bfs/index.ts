import type { AnimModule, AnimHandle } from '~/lib/anim/types';
import {
  buildFrame,
  svgEl,
  htmlEl,
  makeBtn,
  attachCodePanel,
  attachStepRunner,
} from '~/lib/anim/svg';
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
  /** Index into the pseudocode `CODE` array — drives the line-highlight. */
  codeLine: number;
}

const CODE = [
  'q = deque([start])',
  'visited = {start}',
  'while q:',
  '    u = q.popleft()',
  '    for v in adj(u):',
  '        if v not in visited:',
  '            visited.add(v)',
  '            q.append(v)',
];

const bfs: AnimModule = {
  ...meta,

  mount(host): AnimHandle {
    const frame = buildFrame(host, {
      title: meta.title,
      caption: meta.caption,
      badge: 'Step-by-step',
    });
    const { stage, controls, readout } = frame;

    const SIZE_W = 480;
    const SIZE_H = 260;
    const svg = svgEl('svg', {
      viewBox: `0 0 ${SIZE_W} ${SIZE_H}`,
      width: SIZE_W,
      style: 'max-width:100%;height:auto;',
    });
    stage.appendChild(svg);

    const codePanel = attachCodePanel(frame, { lines: CODE });

    let start = 0;
    let steps: Step[] = [];

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
      const push = (current: number, note: string, codeLine: number): void => {
        steps.push({
          states: [...states],
          queue: [...queue],
          current,
          visited: [...visited],
          note,
          codeLine,
        });
      };
      push(-1, `init: enqueue start ${start}`, 0);
      while (queue.length > 0) {
        push(-1, 'loop condition', 2);
        const u = queue.shift()!;
        states[u] = 'current';
        push(u, `dequeue ${u}`, 3);
        for (const v of adj(u)) {
          push(u, `check neighbor ${v}`, 4);
          if (!enqueued.has(v)) {
            push(u, `not visited — enqueue ${v}`, 5);
            enqueued.add(v);
            queue.push(v);
            states[v] = 'queued';
            push(u, `enqueue neighbor ${v}`, 7);
          }
        }
        states[u] = 'visited';
        visited.push(u);
        push(-1, `mark ${u} visited`, 2);
      }
      push(-1, 'done', 2);
    }

    function colorFor(state: NodeState): string {
      switch (state) {
        case 'unvisited': return token('--anim-bar-bg');
        case 'queued': return token('--anim-highlight');
        case 'current': return token('--anim-pivot');
        case 'visited': return token('--anim-sorted');
      }
    }

    function draw(cursor: number): void {
      svg.innerHTML = '';
      const s = steps[cursor];
      if (!s) return;

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

      codePanel.highlight(s.codeLine);
    }

    genSteps();

    const runner = attachStepRunner({
      controls,
      totalSteps: () => steps.length,
      onStep: draw,
      onReset: () => genSteps(),
      prefersReducedMotion: prefersReducedMotion(),
    });

    // Extra: "cycle start" — pick a different starting node and replay.
    controls.appendChild(
      makeBtn('Cycle start', () => {
        start = (start + 1) % NODES.length;
        genSteps();
        runner.reset();
      }),
    );

    const offTheme = onThemeChange(() => draw(runner.getCursor()));

    return {
      pause(): void { runner.pause(); },
      resume(): void { /* user clicks play */ },
      reset(): void { runner.reset(); },
      destroy(): void {
        runner.destroy();
        offTheme();
        host.innerHTML = '';
      },
    };
  },
};

export default bfs;
