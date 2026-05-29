import type { AnimModule, AnimHandle } from '~/lib/anim/types';
import { buildFrame, svgEl, htmlEl, makeBtn, makeSlider } from '~/lib/anim/svg';
import { token, onThemeChange } from '~/lib/anim/theme';
import { mulberry32, shuffled } from '~/lib/anim/rng';
import { prefersReducedMotion } from '~/lib/anim/a11y';
import meta from './meta';

/**
 * Mergesort — visual companion to quicksort.
 * Same frame-queue + step/play/reset pattern: every animation step is an
 * immutable snapshot, rendering is decoupled from the algorithm.
 */
const mergesort: AnimModule = {
  ...meta,

  mount(host, opts = {}): AnimHandle {
    const { stage, controls, readout } = buildFrame(host, {
      title: meta.title,
      caption: meta.caption,
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

    let n = Number(opts['n'] ?? mergesort.defaults!['n']);
    let seed = Number(opts['seed'] ?? mergesort.defaults!['seed']);
    let speed = 1;
    let paused = false;
    let runToken = 0;

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
        });
      };

      function mergeSortRec(lo: number, hi: number): void {
        if (hi - lo <= 1) {
          sorted.add(lo);
          push(lo, hi, lo, -1, -1, -1, `single element @ ${lo}, mark sorted`);
          return;
        }
        const mid = (lo + hi) >> 1;
        push(lo, hi, mid, -1, -1, -1, `split [${lo}, ${hi}) at ${mid}`);
        mergeSortRec(lo, mid);
        mergeSortRec(mid, hi);
        // Merge
        const left = arr.slice(lo, mid);
        const right = arr.slice(mid, hi);
        let i = 0;
        let j = 0;
        let k = lo;
        while (i < left.length && j < right.length) {
          comparisons++;
          push(lo, hi, mid, lo + i, mid + j, k, `compare ${left[i]} vs ${right[j]}`);
          if (left[i]! <= right[j]!) {
            arr[k] = left[i]!;
            writes++;
            push(lo, hi, mid, lo + i, mid + j, k, `write ${left[i]} from left → ${k}`);
            i++;
            k++;
          } else {
            arr[k] = right[j]!;
            writes++;
            push(lo, hi, mid, lo + i, mid + j, k, `write ${right[j]} from right → ${k}`);
            j++;
            k++;
          }
        }
        while (i < left.length) {
          arr[k] = left[i]!;
          writes++;
          push(lo, hi, mid, lo + i, -1, k, `drain left → ${k}`);
          i++;
          k++;
        }
        while (j < right.length) {
          arr[k] = right[j]!;
          writes++;
          push(lo, hi, mid, -1, mid + j, k, `drain right → ${k}`);
          j++;
          k++;
        }
        for (let s = lo; s < hi; s++) sorted.add(s);
        push(lo, hi, mid, -1, -1, -1, `range [${lo}, ${hi}) merged`);
      }

      mergeSortRec(0, arr.length);
      for (let k = 0; k < arr.length; k++) sorted.add(k);
      push(0, arr.length, -1, -1, -1, -1, 'done');
    }

    function colorFor(idx: number, s: Step): string {
      if (s.sorted.has(idx)) return token('--anim-sorted');
      if (idx === s.compareL) return token('--anim-compare');
      if (idx === s.compareR) return token('--anim-pivot');
      if (idx === s.writeIdx) return token('--anim-highlight');
      if (idx >= s.lo && idx < s.hi) return token('--anim-node-follower');
      return token('--anim-bar-bg');
    }

    function draw(): void {
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
    }

    function tick(): void {
      if (paused) return;
      if (cursor >= steps.length - 1) {
        clearTimer();
        return;
      }
      cursor++;
      draw();
      timer = setTimeout(tick, Math.max(40, 240 / speed));
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

    function reshuffle(): void {
      seed = Math.floor(Math.random() * 1e9);
      reset();
    }

    controls.appendChild(makeBtn('play', play, { primary: true }));
    controls.appendChild(makeBtn('step', stepOne));
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
        /* user explicitly clicks play */
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

export default mergesort;
