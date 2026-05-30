import type { AnimModule, AnimHandle } from '~/lib/anim/types';
import {
  buildFrame,
  svgEl,
  htmlEl,
  makeBtn,
  makeSlider,
  attachCodePanel,
  attachStepRunner,
} from '~/lib/anim/svg';
import { token, onThemeChange } from '~/lib/anim/theme';
import { mulberry32, shuffled } from '~/lib/anim/rng';
import { prefersReducedMotion } from '~/lib/anim/a11y';
import meta from './meta';

// Frame queue model — drive the animation by enqueueing immutable snapshots.
// The renderer is decoupled from the algorithm, so the same step()/play()
// controls work across every DSA anim built on this template.
interface Step {
  arr: number[];
  i: number;       // current scan
  j: number;       // partition boundary
  lo: number;
  hi: number;
  pivot: number;   // index
  sorted: Set<number>;
  note: string;
  comparisons: number;
  swaps: number;
  /** Index into the pseudocode `CODE` array — drives the line-highlight. */
  codeLine: number;
}

const CODE = [
  'def quick_sort(a, lo, hi):',
  '    if lo < hi:',
  '        p = partition(a, lo, hi)',
  '        quick_sort(a, lo, p-1)',
  '        quick_sort(a, p+1, hi)',
  'def partition(a, lo, hi):',
  '    pivot = a[hi]',
  '    i = lo - 1',
  '    for j in range(lo, hi):',
  '        if a[j] <= pivot:',
  '            i += 1',
  '            swap(a, i, j)',
  '    swap(a, i+1, hi)',
  '    return i+1',
];

/**
 * Quicksort — Lomuto partition.
 * Canonical DSA animation template: bar chart over an array, step-driven
 * frame queue, dark/light token-aware, reduced-motion respected, fully
 * pausable + destroyable.
 *
 * Subsequent sorting anims (merge, heap, etc.) should follow this shape.
 */
const quicksort: AnimModule = {
  ...meta,

  mount(host, opts = {}): AnimHandle {
    const frame = buildFrame(host, {
      title: 'Quicksort — Lomuto partition',
      caption:
        'Pivot moves to its final position, then the array splits around it. Watch comparisons, swaps, and the boundary advance.',
      badge: 'Step-by-step',
    });
    const { stage, controls, readout } = frame;

    const SIZE_W = 560;
    const SIZE_H = 240;
    const svg = svgEl('svg', {
      viewBox: `0 0 ${SIZE_W} ${SIZE_H}`,
      width: SIZE_W,
      style: 'max-width:100%;height:auto;',
    });
    stage.appendChild(svg);

    const codePanel = attachCodePanel(frame, { lines: CODE });

    let n = Number(opts['n'] ?? quicksort.defaults!['n']);
    let seed = Number(opts['seed'] ?? quicksort.defaults!['seed']);

    let steps: Step[] = [];

    function genSteps(): void {
      const rng = mulberry32(seed);
      const arr = shuffled(Array.from({ length: n }, (_, k) => k + 1), rng);
      const sorted = new Set<number>();
      let comparisons = 0;
      let swaps = 0;

      const push = (
        i: number,
        j: number,
        lo: number,
        hi: number,
        pivot: number,
        note: string,
        codeLine: number,
      ) => {
        steps.push({
          arr: [...arr],
          i,
          j,
          lo,
          hi,
          pivot,
          sorted: new Set(sorted),
          note,
          comparisons,
          swaps,
          codeLine,
        });
      };

      function quicksortRec(lo: number, hi: number): void {
        push(-1, -1, lo, hi, hi, `quick_sort(a, ${lo}, ${hi})`, 0);
        if (lo > hi) return;
        if (lo === hi) {
          sorted.add(lo);
          push(lo, lo, lo, hi, lo, `lo === hi @ ${lo}, mark sorted`, 1);
          return;
        }
        push(-1, -1, lo, hi, hi, `lo < hi → partition`, 1);
        const pivot = hi;
        push(lo, lo - 1, lo, hi, pivot, `partition lo=${lo} hi=${hi}`, 5);
        push(lo, lo - 1, lo, hi, pivot, `pivot = a[${pivot}] = ${arr[pivot]}`, 6);
        let boundary = lo - 1;
        push(lo, boundary, lo, hi, pivot, `i = ${boundary}`, 7);
        for (let k = lo; k < hi; k++) {
          comparisons++;
          push(k, boundary, lo, hi, pivot, `j = ${k}, compare a[${k}]=${arr[k]} vs pivot=${arr[pivot]}`, 8);
          if (arr[k]! <= arr[pivot]!) {
            push(k, boundary, lo, hi, pivot, `a[${k}] ≤ pivot`, 9);
            boundary++;
            push(k, boundary, lo, hi, pivot, `i += 1 → ${boundary}`, 10);
            if (boundary !== k) {
              [arr[boundary], arr[k]] = [arr[k]!, arr[boundary]!];
              swaps++;
              push(k, boundary, lo, hi, pivot, `swap a[${boundary}] ⇄ a[${k}]`, 11);
            } else {
              push(k, boundary, lo, hi, pivot, `swap a[${boundary}] ⇄ a[${k}] (in place)`, 11);
            }
          }
        }
        boundary++;
        [arr[boundary], arr[pivot]] = [arr[pivot]!, arr[boundary]!];
        swaps++;
        sorted.add(boundary);
        push(boundary, boundary, lo, hi, boundary, `swap a[${boundary}] ⇄ a[${hi}] — pivot placed`, 12);
        push(boundary, boundary, lo, hi, boundary, `return ${boundary}`, 13);
        push(boundary, boundary, lo, hi, boundary, `recurse left [${lo}, ${boundary - 1}]`, 3);
        quicksortRec(lo, boundary - 1);
        push(boundary, boundary, lo, hi, boundary, `recurse right [${boundary + 1}, ${hi}]`, 4);
        quicksortRec(boundary + 1, hi);
      }

      steps = [];
      quicksortRec(0, arr.length - 1);
      for (let k = 0; k < arr.length; k++) sorted.add(k);
      push(-1, -1, 0, arr.length - 1, -1, 'done', 0);
    }

    function colorFor(idx: number, step: Step): string {
      if (step.sorted.has(idx)) return token('--anim-sorted');
      if (idx === step.pivot) return token('--anim-pivot');
      if (idx === step.i) return token('--anim-highlight');
      if (idx <= step.j) return token('--anim-compare');
      if (idx >= step.lo && idx <= step.hi) return token('--anim-node-follower');
      return token('--anim-bar-bg');
    }

    function draw(cursor: number): void {
      svg.innerHTML = '';
      const step = steps[cursor];
      if (!step) return;
      const len = step.arr.length;
      const gap = 4;
      const margin = 20;
      const usable = SIZE_W - margin * 2;
      const w = (usable - gap * (len - 1)) / len;
      const max = Math.max(...step.arr);
      const baseY = SIZE_H - 40;
      const maxH = SIZE_H - 70;

      for (let k = 0; k < len; k++) {
        const v = step.arr[k]!;
        const h = (v / max) * maxH;
        const x = margin + k * (w + gap);
        const y = baseY - h;
        svg.appendChild(
          svgEl('rect', {
            x,
            y,
            width: w,
            height: h,
            rx: 3,
            fill: colorFor(k, step),
          }),
        );
        if (len <= 24) {
          const label = svgEl('text', {
            x: x + w / 2,
            y: baseY + 14,
            'text-anchor': 'middle',
            fill: token('--anim-text-muted'),
            'font-size': 10,
            'font-family': 'JetBrains Mono, monospace',
          });
          label.textContent = String(v);
          svg.appendChild(label);
        }
      }

      const note = svgEl('text', {
        x: margin,
        y: 18,
        fill: token('--anim-text-muted'),
        'font-size': 12,
        'font-family': 'JetBrains Mono, monospace',
      });
      note.textContent = step.note;
      svg.appendChild(note);

      readout.innerHTML = '';
      readout.appendChild(htmlEl('span', {}, `step: ${cursor + 1} / ${steps.length}`));
      readout.appendChild(htmlEl('span', {}, `comparisons: ${step.comparisons}`));
      readout.appendChild(htmlEl('span', {}, `swaps: ${step.swaps}`));
      readout.appendChild(htmlEl('span', {}, `n: ${n} · seed: ${seed}`));

      codePanel.highlight(step.codeLine);
    }

    genSteps();

    const runner = attachStepRunner({
      controls,
      totalSteps: () => steps.length,
      onStep: draw,
      onReset: () => genSteps(),
      prefersReducedMotion: prefersReducedMotion(),
    });

    // Extras: reshuffle + n slider. Speed is handled by the standard runner.
    controls.appendChild(
      makeBtn('Reshuffle', () => {
        seed = Math.floor(Math.random() * 1e9);
        genSteps();
        runner.reset();
      }),
    );
    controls.appendChild(
      makeSlider({
        label: 'n',
        min: 6,
        max: 32,
        step: 1,
        value: n,
        onChange: (v) => {
          n = v;
          genSteps();
          runner.reset();
        },
      }),
    );

    const offTheme = onThemeChange(() => draw(runner.getCursor()));

    return {
      pause(): void { runner.pause(); },
      resume(): void {
        // Only resume if user had set it running.
        // Default is "paused on load" — user explicitly clicks play.
      },
      reset(): void { runner.reset(); },
      destroy(): void {
        runner.destroy();
        offTheme();
        host.innerHTML = '';
      },
    };
  },
};

export default quicksort;
