import type { AnimModule, AnimHandle } from '~/lib/anim/types';
import { buildFrame, svgEl, htmlEl, makeBtn } from '~/lib/anim/svg';
import { token, onThemeChange } from '~/lib/anim/theme';
import meta from './meta';

// Ported from Brain-Detox-arc/docs/javascripts/animations.js:1081-1179.
interface VcEvent {
  id: number;
  t: number;
  node: number;
  kind: 'local' | 'send' | 'recv';
  matchId?: number;
  payload?: number[];
  vc: number[];
}

const TRACKS = [
  { y: 60, label: 'A' },
  { y: 130, label: 'B' },
  { y: 200, label: 'C' },
];

const vectorClock: AnimModule = {
  ...meta,

  mount(host): AnimHandle {
    const { stage, controls, readout } = buildFrame(host, {
      title: meta.title,
      caption: meta.caption,
      badge: 'Interactive',
    });

    const svg = svgEl('svg', {
      viewBox: '0 0 480 240',
      width: 480,
      style: 'max-width:100%;height:auto;',
    });
    stage.appendChild(svg);

    let events: VcEvent[] = [];

    function compute(): void {
      const state = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ];
      for (const e of events) {
        if (e.kind === 'local') {
          state[e.node]![e.node]!++;
        } else if (e.kind === 'send') {
          state[e.node]![e.node]!++;
          e.payload = state[e.node]!.slice();
        } else {
          const src = events.find((x) => x.id === e.matchId);
          if (src?.payload) {
            for (let i = 0; i < 3; i++) {
              state[e.node]![i] = Math.max(state[e.node]![i]!, src.payload[i]!);
            }
            state[e.node]![e.node]!++;
          }
        }
        e.vc = state[e.node]!.slice();
      }
    }

    function draw(): void {
      svg.innerHTML = '';
      for (const tr of TRACKS) {
        svg.appendChild(
          svgEl('line', { x1: 30, y1: tr.y, x2: 460, y2: tr.y, stroke: token('--anim-edge-idle'), 'stroke-width': 1 }),
        );
        const lbl = svgEl('text', {
          x: 14,
          y: tr.y + 4,
          fill: token('--anim-text-muted'),
          'font-size': 12,
          'font-weight': 600,
        });
        lbl.textContent = tr.label;
        svg.appendChild(lbl);
      }

      compute();

      // Defs with arrow marker.
      const defs = svgEl('defs');
      const marker = svgEl('marker', {
        id: 'vc-arrow',
        viewBox: '0 0 10 10',
        refX: 8,
        refY: 5,
        markerWidth: 6,
        markerHeight: 6,
        orient: 'auto',
      });
      marker.appendChild(svgEl('path', { d: 'M0 0 L10 5 L0 10 z', fill: token('--anim-pivot'), opacity: 0.8 }));
      defs.appendChild(marker);
      svg.appendChild(defs);

      // Send arrows
      for (const e of events) {
        if (e.kind !== 'send') continue;
        const m = events.find((x) => x.id === e.matchId);
        if (!m) continue;
        const x1 = 50 + e.t * 21;
        const y1 = TRACKS[e.node]!.y;
        const x2 = 50 + m.t * 21;
        const y2 = TRACKS[m.node]!.y;
        svg.appendChild(
          svgEl('path', {
            d: `M${x1} ${y1} Q${(x1 + x2) / 2} ${(y1 + y2) / 2 - 10} ${x2} ${y2}`,
            stroke: token('--anim-pivot'),
            fill: 'none',
            'stroke-width': 1.5,
            opacity: 0.6,
            'marker-end': 'url(#vc-arrow)',
          }),
        );
      }

      // Event dots + VC labels
      for (const e of events) {
        const x = 50 + e.t * 21;
        const y = TRACKS[e.node]!.y;
        svg.appendChild(svgEl('circle', { cx: x, cy: y, r: 7, fill: token('--anim-compare') }));
        const lbl = svgEl('text', {
          x,
          y: y - 14,
          'text-anchor': 'middle',
          fill: token('--anim-text-muted'),
          'font-size': 10,
          'font-family': 'JetBrains Mono, monospace',
        });
        lbl.textContent = `[${e.vc[0]},${e.vc[1]},${e.vc[2]}]`;
        svg.appendChild(lbl);
      }

      readout.innerHTML = '';
      readout.appendChild(htmlEl('span', {}, `events: ${events.length}`));
      readout.appendChild(htmlEl('span', {}, '[A, B, C] = vector clock'));
    }

    function loadScenario(): void {
      events = [];
      let id = 0;
      events.push({ id: ++id, t: 1, node: 0, kind: 'local', vc: [0, 0, 0] });
      const sendId = ++id;
      events.push({ id: sendId, t: 3, node: 0, kind: 'send', matchId: 0, vc: [0, 0, 0] });
      const recvId = ++id;
      events.push({ id: recvId, t: 6, node: 1, kind: 'recv', matchId: sendId, vc: [0, 0, 0] });
      const sendEntry = events.find((e) => e.id === sendId);
      if (sendEntry) sendEntry.matchId = recvId;
      events.push({ id: ++id, t: 8, node: 1, kind: 'local', vc: [0, 0, 0] });
      const s2 = ++id;
      events.push({ id: s2, t: 10, node: 1, kind: 'send', matchId: 0, vc: [0, 0, 0] });
      const r2 = ++id;
      events.push({ id: r2, t: 13, node: 2, kind: 'recv', matchId: s2, vc: [0, 0, 0] });
      const send2Entry = events.find((e) => e.id === s2);
      if (send2Entry) send2Entry.matchId = r2;
      events.push({ id: ++id, t: 15, node: 2, kind: 'local', vc: [0, 0, 0] });
      events.push({ id: ++id, t: 16, node: 0, kind: 'local', vc: [0, 0, 0] });
      draw();
    }

    controls.appendChild(makeBtn('load scenario', loadScenario, { primary: true }));
    controls.appendChild(
      makeBtn('clear', () => {
        events = [];
        draw();
      }),
    );

    const offTheme = onThemeChange(() => draw());
    loadScenario();

    return {
      pause(): void {
        /* static */
      },
      resume(): void {
        /* static */
      },
      reset(): void {
        loadScenario();
      },
      destroy(): void {
        offTheme();
        host.innerHTML = '';
      },
    };
  },
};

export default vectorClock;
