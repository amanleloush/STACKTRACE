import type { AnimModule, AnimHandle } from '~/lib/anim/types';
import { buildFrame, svgEl, htmlEl, makeBtn } from '~/lib/anim/svg';
import { token, onThemeChange } from '~/lib/anim/theme';
import meta from './meta';

/**
 * Raft — leader election + log replication.
 * Ported from Brain-Detox-Arc/docs/javascripts/animations.js:240-404.
 */
const raft: AnimModule = {
  ...meta,

  mount(host): AnimHandle {
    const { stage, controls, readout } = buildFrame(host, {
      title: 'Raft — leader election & log replication',
      caption:
        'Five-node cluster. Kill the leader to trigger an election; partition the network to see Raft refuse progress without a quorum.',
      badge: 'Interactive',
    });

    const SIZE = 460;
    const svg = svgEl('svg', {
      viewBox: `0 0 ${SIZE} 260`,
      width: SIZE,
      style: 'max-width:100%;height:auto;',
    });
    stage.appendChild(svg);

    const N = 5;
    interface RaftNode {
      i: number;
      x: number;
      y: number;
      state: 'leader' | 'follower' | 'candidate';
      term: number;
      log: { id: number; committed: boolean }[];
      down: boolean;
    }

    const initial: RaftNode[] = [];
    const cx = SIZE / 2;
    const cy = 130;
    const R = 95;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 - Math.PI / 2;
      initial.push({
        i,
        x: cx + Math.cos(a) * R,
        y: cy + Math.sin(a) * R,
        state: i === 0 ? 'leader' : 'follower',
        term: 1,
        log: [],
        down: false,
      });
    }
    let nodes: RaftNode[] = initial.map((n) => ({ ...n, log: [] }));
    let term = 1;
    let leaderId = 0;
    let paused = false;

    // Track every async handle so pause/destroy can cancel cleanly.
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const rafIds = new Set<number>();
    function later(fn: () => void, ms: number): void {
      if (paused) return;
      const t = setTimeout(() => {
        timers.delete(t);
        fn();
      }, ms);
      timers.add(t);
    }
    function clearTimers(): void {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
      rafIds.forEach((id) => cancelAnimationFrame(id));
      rafIds.clear();
    }

    function nodeFill(n: RaftNode): string {
      if (n.down) return token('--anim-node-down');
      if (n.state === 'leader') return token('--anim-node-leader');
      if (n.state === 'candidate') return token('--anim-node-candidate');
      return token('--anim-node-follower');
    }

    function draw(): void {
      svg.innerHTML = '';

      // mesh
      const edgeColor = token('--anim-edge-idle');
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          svg.appendChild(
            svgEl('line', {
              x1: nodes[i]!.x,
              y1: nodes[i]!.y,
              x2: nodes[j]!.x,
              y2: nodes[j]!.y,
              stroke: edgeColor,
              'stroke-width': 1,
              opacity: 0.4,
            }),
          );
        }
      }

      nodes.forEach((n) => {
        const g = svgEl('g');
        g.setAttribute('transform', `translate(${n.x},${n.y})`);
        g.style.opacity = n.down ? '0.35' : '1';
        const c = svgEl('circle', { r: 22, cx: 0, cy: 0, fill: nodeFill(n) });
        g.appendChild(c);

        const lbl = svgEl('text', {
          x: 0,
          y: 4,
          'text-anchor': 'middle',
          fill: '#fff',
          'font-weight': 700,
          'font-size': 14,
          'font-family': 'JetBrains Mono, monospace',
        });
        lbl.textContent = n.state === 'leader' ? 'L' : n.state === 'candidate' ? 'C' : 'F';
        g.appendChild(lbl);

        const sub = svgEl('text', {
          x: 0,
          y: 40,
          'text-anchor': 'middle',
          fill: token('--anim-text-muted'),
          'font-size': 11,
          'font-family': 'JetBrains Mono, monospace',
        });
        sub.textContent = `n${n.i}·t${n.term}`;
        g.appendChild(sub);

        for (let li = 0; li < Math.min(n.log.length, 5); li++) {
          g.appendChild(
            svgEl('rect', {
              x: -22 + li * 9,
              y: -38,
              width: 7,
              height: 7,
              rx: 1.5,
              fill: token('--anim-highlight'),
              opacity: n.log[li]!.committed ? 1 : 0.45,
            }),
          );
        }
        svg.appendChild(g);
      });

      const alive = nodes.filter((n) => !n.down).length;
      readout.innerHTML = '';
      readout.appendChild(htmlEl('span', {}, `term: ${term}`));
      readout.appendChild(htmlEl('span', {}, `leader: ${leaderId === -1 ? '(none)' : 'n' + leaderId}`));
      readout.appendChild(
        htmlEl('span', {}, `quorum: ${Math.floor(N / 2) + 1} · alive: ${alive}`),
      );
    }

    function flashMsg(from: RaftNode, to: RaftNode): void {
      if (paused) return;
      const dot = svgEl('circle', { r: 4, cx: from.x, cy: from.y, fill: token('--anim-compare') });
      svg.appendChild(dot);
      const start = performance.now();
      const step = (t: number): void => {
        const u = Math.min(1, (t - start) / 600);
        dot.setAttribute('cx', String(from.x + (to.x - from.x) * u));
        dot.setAttribute('cy', String(from.y + (to.y - from.y) * u));
        dot.setAttribute('opacity', String(1 - u * 0.7));
        if (u < 1 && !paused) {
          const id = requestAnimationFrame(step);
          rafIds.add(id);
        } else {
          dot.remove();
        }
      };
      const id = requestAnimationFrame(step);
      rafIds.add(id);
    }

    function elect(): void {
      term++;
      const alive = nodes.filter((n) => !n.down);
      if (alive.length < Math.floor(N / 2) + 1) {
        nodes.forEach((n) => {
          if (!n.down) n.state = 'candidate';
        });
        leaderId = -1;
        draw();
        return;
      }
      const cand = alive.find((n) => n.state !== 'leader') ?? alive[0]!;
      nodes.forEach((n) => {
        if (!n.down) {
          n.state = n === cand ? 'candidate' : 'follower';
          n.term = term;
        }
      });
      draw();
      alive.forEach((n) => {
        if (n !== cand) flashMsg(cand, n);
      });
      later(() => {
        nodes.forEach((n) => {
          n.state = n === cand ? 'leader' : n.down ? n.state : 'follower';
        });
        leaderId = cand.i;
        draw();
      }, 700);
    }

    function appendLog(): void {
      const leader = nodes[leaderId];
      if (!leader || leader.down) return;
      const entry = { id: leader.log.length + 1, committed: false };
      leader.log.push(entry);
      nodes.forEach((n) => {
        if (n !== leader && !n.down) flashMsg(leader, n);
      });
      later(() => {
        nodes.forEach((n) => {
          if (!n.down && n !== leader) n.log.push({ ...entry });
        });
        nodes.forEach((n) => {
          if (n !== leader && !n.down) flashMsg(n, leader);
        });
        later(() => {
          nodes.forEach((n) => n.log.forEach((e) => { if (e.id === entry.id) e.committed = true; }));
          draw();
        }, 600);
        draw();
      }, 700);
    }

    function killLeader(): void {
      if (leaderId === -1) return;
      nodes[leaderId]!.down = true;
      leaderId = -1;
      draw();
      later(elect, 600);
    }

    function partition(): void {
      nodes[3]!.down = true;
      nodes[4]!.down = true;
      draw();
    }

    function heal(): void {
      nodes.forEach((n) => (n.down = false));
      draw();
    }

    controls.appendChild(makeBtn('append log entry', appendLog, { primary: true }));
    controls.appendChild(makeBtn('kill leader', killLeader));
    controls.appendChild(makeBtn('partition (–2)', partition));
    controls.appendChild(makeBtn('heal cluster', heal));

    const offTheme = onThemeChange(() => draw());
    draw();

    return {
      pause(): void {
        paused = true;
      },
      resume(): void {
        paused = false;
      },
      reset(): void {
        clearTimers();
        nodes = initial.map((n) => ({ ...n, log: [] }));
        term = 1;
        leaderId = 0;
        paused = false;
        draw();
      },
      destroy(): void {
        clearTimers();
        offTheme();
        host.innerHTML = '';
      },
    };
  },
};

export default raft;
