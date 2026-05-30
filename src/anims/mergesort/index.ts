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

interface Step {
  arr: number[];
  lo: number;        // active range start (inclusive)
  hi: number;        // active range end (exclusive)
  mid: number;       // current split point
  compareL: number;  // current index into left half
  compareR: number;  // current index into right half
  writeIdx: number;  // next position to fill in arr
  sorted: Set<number>;
  note: string;
  comparisons: number;
  writes: number;
  /** Index into the pseudocode `CODE` array — drives the line-highlight. */
  codeLine: number;
}

const CODE = [
  'def merge_sort(a):',
  '    if len(a) <= 1: return a',
  '    mid = len(a) // 2',
  '    L = merge_sort(a[:mid])',
  '    R = merge_sort(a[mid:])',
  '    return merge(L, R)',
  'def merge(L, R):',
  '    out = []',
  '    while L and R:',
  '        out.append((L if L[0] <= R[0] else R).pop(0))',
  '    return out + L + R',
];

/**
 * Mergesort — visual companion to quicksort.
 * Same frame-queue + step/play/reset pattern: every animation step is an
 * immutable snapshot, rendering is decoupled from the algorithm.
 */
const mergesort: AnimModule = {
  ...meta,

  mount(host, opts = {}): AnimHandle {
    const frame = buildFrame(host, {
      title: meta.title,
      caption: meta.caption,
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

    let n = Number(opts['n'] ?? mergesort.defaults!['n']);
    let seed = Number(opts['seed'] ?? mergesort.defaults!['seed']);

    let steps: Step[] = [];

    function genSteps(): void {
      const rng = mulberry32(seed);
      const arr = shuffled(Array.from({ length: n }, (_, k) => k + 1), rng);
      const sorted = new Set<number>();
      let comparisons = 0;
      let writes = 0;
      steps = [];

      const push = (
        lo: number,
        hi: number,
        mid: number,
        cL: number,
        cR: number,
        wIdx: number,
        note: string,
        codeLine: number,
      ): void => {
        steps.push({
          arr: [...arr],
          lo,
          hi,
          mid,
          compareL: cL,
          compareR: cR,
          writeIdx: wIdx,
          sorted: new Set(sorted),
          note,
          comparisons,
          writes,
          codeLine,
        });
      };

      function mergeSortRec(lo: number, hi: number): void {
        push(lo, hi, (lo + hi) >> 1, -1, -1, -1, `merge_sort [${lo}, ${hi})`, 0);
        if (hi - lo <= 1) {
          sorted.add(lo);
          push(lo, hi, lo, -1, -1, -1, `single element @ ${lo}, mark sorted`, 1);
          return;
        }
        const mid = (lo + hi) >> 1;
        push(lo, hi, mid, -1, -1, -1, `split [${lo}, ${hi}) at ${mid}`, 2);
        push(lo, hi, mid, -1, -1, -1, `recurse left [${lo}, ${mid})`, 3);
        mergeSortRec(lo, mid);
        push(lo, hi, mid, -1, -1, -1, `recurse right [${mid}, ${hi})`, 4);
        mergeSortRec(mid, hi);
        // Merge
        push(lo, hi, mid, -1, -1, -1, `merge [${lo}, ${mid}) + [${mid}, ${hi})`, 5);
        const left = arr.slice(lo, mid);
        const right = arr.slice(mid, hi);
        let i = 0;
        let j = 0;
        let k = lo;
        push(lo, hi, mid, -1, -1, -1, `enter merge`, 6);
        push(lo, hi, mid, -1, -1, -1, `out = []`, 7);
        while (i < left.length && j < right.length) {
          comparisons++;
          push(lo, hi, mid, lo + i, mid + j, k, `compare ${left[i]} vs ${right[j]}`, 8);
          if (left[i]! <= right[j]!) {
            arr[k] = left[i]!;
            writes++;
            push(lo, hi, mid, lo + i, mid + j, k, `write ${left[i]} from left → ${k}`, 9);
            i++;
            k++;
          } else {
            arr[k] = right[j]!;
            writes++;
            push(lo, hi, mid, lo + i, mid + j, k, `write ${right[j]} from right → ${k}`, 9);
            j++;
            k++;
          }
        }
        while (i < left.length) {
          arr[k] = left[i]!;
          writes++;
          push(lo, hi, mid, lo + i, -1, k, `drain left → ${k}`, 10);
          i++;
          k++;
        }
        while (j < right.length) {
          arr[k] = right[j]!;
          writes++;
          push(lo, hi, mid, -1, mid + j, k, `drain right → ${k}`, 10);
          j++;
          k++;
        }
        for (let s = lo; s < hi; s++) sorted.add(s);
        push(lo, hi, mid, -1, -1, -1, `range [${lo}, ${hi}) merged`, 5);
      }

      mergeSortRec(0, arr.length);
      for (let k = 0; k < arr.length; k++) sorted.add(k);
      push(0, arr.length, -1, -1, -1, -1, 'done', 5);
    }

    function colorFor(idx: number, s: Step): string {
      if (s.sorted.has(idx)) return token('--anim-sorted');
      if (idx === s.compareL) return token('--anim-compare');
      if (idx === s.compareR) return token('--anim-pivot');
      if (idx === s.writeIdx) return token('--anim-highlight');
      if (idx >= s.lo && idx < s.hi) return token('--anim-node-follower');
      return token('--anim-bar-bg');
    }

    function draw(cursor: number): void {
      svg.innerHTML = '';
      const s = steps[cursor];
      if (!s) return;
      const len = s.arr.length;
      const gap = 4;
      const margin = 20;
      const usable = SIZE_W - margin * 2;
      const w = (usable - gap * (len - 1)) / len;
      const max = Math.max(...s.arr);
      const baseY = SIZE_H - 40;
      const maxH = SIZE_H - 70;

      for (let k = 0; k < len; k++) {
        const v = s.arr[k]!;
        const h = (v / max) * maxH;
        const x = margin + k * (w + gap);
        const y = baseY - h;
        svg.appendChild(
          svgEl('rect', { x, y, width: w, height: h, rx: 3, fill: colorFor(k, s) }),
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

      // Mid-split divider in the active range
      if (s.mid > s.lo && s.mid < s.hi) {
        const x = margin + s.mid * (w + gap) - gap / 2;
        svg.appendChild(
          svgEl('line', {
            x1: x,
            y1: 28,
            x2: x,
            y2: baseY + 4,
            stroke: token('--anim-text-muted'),
            'stroke-width': 1,
            'stroke-dasharray': '3 3',
            opacity: 0.6,
          }),
        );
      }

      const note = svgEl('text', {
        x: margin,
        y: 18,
        fill: token('--anim-text-muted'),
        'font-size': 12,
        'font-family': 'JetBrains Mono, monospace',
      });
      note.textContent = s.note;
      svg.appendChild(note);

      readout.innerHTML = '';
      readout.appendChild(htmlEl('span', {}, `step: ${cursor + 1} / ${steps.length}`));
      readout.appendChild(htmlEl('span', {}, `comparisons: ${s.comparisons}`));
      readout.appendChild(htmlEl('span', {}, `writes: ${s.writes}`));
      readout.appendChild(htmlEl('span', {}, `n: ${n} · seed: ${seed}`));

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

export default mergesort;
