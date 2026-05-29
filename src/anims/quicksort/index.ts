import type { AnimModule, AnimHandle } from '~/lib/anim/types';
import { buildFrame, svgEl, htmlEl, makeBtn, makeSlider } from '~/lib/anim/svg';
import { token, onThemeChange } from '~/lib/anim/theme';
import { mulberry32, shuffled } from '~/lib/anim/rng';
import { prefersReducedMotion } from '~/lib/anim/a11y';
import meta from './meta';

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
    const { stage, controls, readout } = buildFrame(host, {
      title: 'Quicksort — Lomuto partition',
      caption:
        'Pivot moves to its final position, then the array splits around it. Watch comparisons, swaps, and the boundary advance.',
      badge: 'Interactive',
    });

    const SIZE_W = 560;
    const SIZE_H = 240;
    const svg = svgEl('svg', {
      viewBox: `0 0 ${SIZE_W} ${SIZE_H}`,
      width: SIZE_W,
      style: 'max-width:100%;height:auto;',
    });
    stage.appendChild(svg);

    let n = Number(opts['n'] ?? quicksort.defaults!['n']);
    let seed = Number(opts['seed'] ?? quicksort.defaults!['seed']);
    let speed = 1;
    let paused = false;
    let runToken = 0;

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
    }
    let steps: Step[] = [];
    let cursor = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    function clearTimer(): void {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    }

    function genSteps(): void {
      const rng = mulberry32(seed);
      const arr = shuffled(Array.from({ length: n }, (_, k) => k + 1), rng);
      const sorted = new Set<number>();
      let comparisons = 0;
      let swaps = 0;

      const push = (i: number, j: number, lo: number, hi: number, pivot: number, note: string) => {
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
        });
      };

      function quicksortRec(lo: number, hi: number): void {
        if (lo > hi) return;
        if (lo === hi) {
          sorted.add(lo);
          push(lo, lo, lo, hi, lo, `lo === hi @ ${lo}, mark sorted`);
          return;
        }
        const pivot = hi;
        push(lo, lo - 1, lo, hi, pivot, `partition lo=${lo} hi=${hi} pivot=${arr[pivot]}`);
        let boundary = lo - 1;
        for (let k = lo; k < hi; k++) {
          comparisons++;
          push(k, boundary, lo, hi, pivot, `compare arr[${k}]=${arr[k]} vs pivot=${arr[pivot]}`);
          if (arr[k]! <= arr[pivot]!) {
            boundary++;
            if (boundary !== k) {
              [arr[boundary], arr[k]] = [arr[k]!, arr[boundary]!];
              swaps++;
              push(k, boundary, lo, hi, pivot, `swap → arr[${boundary}] ⇄ arr[${k}]`);
            } else {
              push(k, boundary, lo, hi, pivot, `advance boundary to ${boundary}`);
            }
          }
        }
        boundary++;
        [arr[boundary], arr[pivot]] = [arr[pivot]!, arr[boundary]!];
        swaps++;
        sorted.add(boundary);
        push(boundary, boundary, lo, hi, boundary, `place pivot at ${boundary}, recurse`);
        quicksortRec(lo, boundary - 1);
        quicksortRec(boundary + 1, hi);
      }

      steps = [];
      quicksortRec(0, arr.length - 1);
      for (let k = 0; k < arr.length; k++) sorted.add(k);
      push(-1, -1, 0, arr.length - 1, -1, 'done');
    }

    function colorFor(idx: number, step: Step): string {
      if (step.sorted.has(idx)) return token('--anim-sorted');
      if (idx === step.pivot) return token('--anim-pivot');
      if (idx === step.i) return token('--anim-highlight');
      if (idx <= step.j) return token('--anim-compare');
      if (idx >= step.lo && idx <= step.hi) return token('--anim-node-follower');
      return token('--anim-bar-bg');
    }

    function draw(): void {
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
    }

    function tick(): void {
      if (paused) return;
      if (cursor >= steps.length - 1) {
        clearTimer();
        return;
      }
      cursor++;
      draw();
      timer = setTimeout(tick, Math.max(40, 280 / speed));
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

    function step(): void {
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

    function reshuffle(): void {
      seed = Math.floor(Math.random() * 1e9);
      reset();
    }

    controls.appendChild(makeBtn('play', play, { primary: true }));
    controls.appendChild(makeBtn('step', step));
    controls.appendChild(makeBtn('reset', reset));
    controls.appendChild(makeBtn('reshuffle', reshuffle));
    controls.appendChild(
      makeSlider({
        label: 'n',
        min: 6,
        max: 32,
        step: 1,
        value: n,
        onChange: (v) => {
          n = v;
          reset();
        },
      }),
    );
    controls.appendChild(
      makeSlider({
        label: 'speed',
        min: 0.25,
        max: 4,
        step: 0.25,
        value: speed,
        onChange: (v) => {
          speed = v;
        },
      }),
    );

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
        // Only resume if user had set it running.
        // Default is "paused on load" — user explicitly clicks play.
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

export default quicksort;
