import type { AnimModule, AnimHandle } from '~/lib/anim/types';
import { buildFrame, svgEl, htmlEl, makeBtn } from '~/lib/anim/svg';
import { token, onThemeChange } from '~/lib/anim/theme';
import meta from './meta';

// Ported from Brain-Detox-arc/docs/javascripts/animations.js:654-738.
const lsmBtree: AnimModule = {
  ...meta,

  mount(host): AnimHandle {
    const { stage, controls, readout } = buildFrame(host, {
      title: meta.title,
      caption: meta.caption,
      badge: 'Interactive',
    });

    const svg = svgEl('svg', {
      viewBox: '0 0 480 260',
      width: 480,
      style: 'max-width:100%;height:auto;',
    });
    stage.appendChild(svg);

    let bpFill = 0;
    let lsmMemtable = 0;
    let lsmL0 = 0;
    let lsmL1 = 0;
    let paused = false;

    const timers = new Set<ReturnType<typeof setTimeout>>();
    function clearTimers(): void {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    }

    function txt(x: number, y: number, content: string, opts: Record<string, string | number> = {}): SVGTextElement {
      const t = svgEl('text', {
        x,
        y,
        fill: token('--anim-text-muted'),
        'font-size': 11,
        'font-family': 'JetBrains Mono, monospace',
        ...opts,
      });
      t.textContent = content;
      return t;
    }

    function draw(): void {
      svg.innerHTML = '';

      // ---- B+ side -----------------------------------------------------------
      svg.appendChild(txt(60, 24, 'B+ tree (Postgres / InnoDB)', { fill: token('--anim-text'), 'font-size': 12, 'font-weight': 600 }));
      svg.appendChild(svgEl('rect', { x: 100, y: 40, width: 80, height: 24, rx: 4, fill: token('--anim-compare') }));
      svg.appendChild(txt(140, 56, 'root', { fill: '#fff', 'text-anchor': 'middle', 'font-weight': 700 }));

      for (let i = 0; i < 3; i++) {
        const x = 30 + i * 60;
        svg.appendChild(svgEl('rect', { x, y: 90, width: 50, height: 22, rx: 3, fill: token('--anim-pivot'), opacity: 0.85 }));
        svg.appendChild(svgEl('line', { x1: 140, y1: 64, x2: x + 25, y2: 90, stroke: token('--anim-edge-idle') }));
        for (let j = 0; j < 2; j++) {
          const lx = x - 5 + j * 28;
          const ly = 140;
          const opacity = bpFill > i * 2 + j ? 1 : 0.35;
          svg.appendChild(svgEl('rect', { x: lx, y: ly, width: 22, height: 20, rx: 2, fill: token('--anim-compare'), opacity }));
          svg.appendChild(svgEl('line', { x1: x + 25, y1: 112, x2: lx + 11, y2: 140, stroke: token('--anim-edge-idle'), opacity: 0.6 }));
        }
      }
      svg.appendChild(
        svgEl('rect', {
          x: 30,
          y: 200,
          width: 200,
          height: 26,
          rx: 4,
          fill: token('--anim-highlight'),
          opacity: 0.2,
          stroke: token('--anim-highlight'),
        }),
      );
      svg.appendChild(txt(130, 218, `WAL (${Math.min(20, bpFill * 2)} pages)`, { 'text-anchor': 'middle' }));

      // ---- LSM side ---------------------------------------------------------
      svg.appendChild(txt(290, 24, 'LSM tree (Cassandra / RocksDB)', { fill: token('--anim-text'), 'font-size': 12, 'font-weight': 600 }));
      // Memtable
      svg.appendChild(
        svgEl('rect', {
          x: 260,
          y: 40,
          width: 200,
          height: 28,
          rx: 4,
          fill: token('--anim-success'),
          opacity: 0.2,
          stroke: token('--anim-success'),
        }),
      );
      svg.appendChild(txt(360, 58, `memtable (${lsmMemtable}/8)`, { 'text-anchor': 'middle' }));
      // L0
      svg.appendChild(txt(260, 92, 'L0:'));
      for (let i = 0; i < lsmL0; i++) {
        svg.appendChild(svgEl('rect', { x: 290 + i * 22, y: 78, width: 18, height: 18, rx: 2, fill: token('--anim-success') }));
      }
      // L1
      svg.appendChild(txt(260, 132, 'L1:'));
      for (let i = 0; i < lsmL1; i++) {
        svg.appendChild(svgEl('rect', { x: 290 + i * 38, y: 118, width: 34, height: 18, rx: 2, fill: token('--anim-compare') }));
      }
      // Commit log
      svg.appendChild(
        svgEl('rect', {
          x: 260,
          y: 200,
          width: 200,
          height: 26,
          rx: 4,
          fill: token('--anim-pivot'),
          opacity: 0.2,
          stroke: token('--anim-pivot'),
        }),
      );
      svg.appendChild(txt(360, 218, 'commit log (append-only)', { 'text-anchor': 'middle' }));

      readout.innerHTML = '';
      readout.appendChild(htmlEl('span', {}, `B+ amp: ~${bpFill > 0 ? '8x' : '1x'} (page + WAL)`));
      readout.appendChild(htmlEl('span', {}, `LSM amp: ~${lsmL1 > 1 ? '12x' : '2x'} (after compaction)`));
      readout.appendChild(htmlEl('span', {}, 'B+ reads: O(log n)'));
      readout.appendChild(htmlEl('span', {}, 'LSM reads: O(levels) + bloom'));
    }

    function write(): void {
      bpFill = Math.min(8, bpFill + 1);
      lsmMemtable++;
      if (lsmMemtable >= 8) {
        lsmMemtable = 0;
        lsmL0++;
        if (lsmL0 >= 4) {
          lsmL0 = 0;
          lsmL1++;
        }
      }
      draw();
    }

    controls.appendChild(makeBtn('insert 1 row', write, { primary: true }));
    controls.appendChild(
      makeBtn('insert 50', () => {
        for (let i = 0; i < 50; i++) {
          const t = setTimeout(() => {
            timers.delete(t);
            if (!paused) write();
          }, i * 60);
          timers.add(t);
        }
      }),
    );
    controls.appendChild(
      makeBtn('compact LSM', () => {
        if (lsmL0 > 0) {
          lsmL0 = 0;
          lsmL1++;
          draw();
        }
      }),
    );
    controls.appendChild(
      makeBtn('reset', () => {
        bpFill = lsmMemtable = lsmL0 = lsmL1 = 0;
        clearTimers();
        draw();
      }),
    );

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
        bpFill = lsmMemtable = lsmL0 = lsmL1 = 0;
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

export default lsmBtree;
