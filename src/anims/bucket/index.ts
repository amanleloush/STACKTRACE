import type { AnimModule, AnimHandle } from '~/lib/anim/types';
import { buildFrame, svgEl, htmlEl, makeBtn } from '~/lib/anim/svg';
import { token, onThemeChange } from '~/lib/anim/theme';
import meta from './meta';

// Ported from Brain-Detox-arc/docs/javascripts/animations.js:405-530.
// Hex literals replaced with semantic tokens; setInterval / rAF handles
// tracked so pause/destroy cleanly cancel them.
const bucket: AnimModule = {
  ...meta,

  mount(host): AnimHandle {
    const { stage, controls, readout } = buildFrame(host, {
      title: meta.title,
      caption: meta.caption,
      badge: 'Interactive',
    });

    const svg = svgEl('svg', {
      viewBox: '0 0 460 230',
      width: 460,
      style: 'max-width:100%;height:auto;',
    });
    stage.appendChild(svg);

    const TB_CAP = 10;
    const LB_CAP = 10;
    let tbCount = 5;
    let lbLevel = 0;
    let allowed = 0;
    let denied = 0;

    let paused = false;
    const timers = new Set<ReturnType<typeof setInterval>>();
    const rafIds = new Set<number>();
    function clearTimers(): void {
      timers.forEach((t) => clearInterval(t));
      timers.clear();
      rafIds.forEach((id) => cancelAnimationFrame(id));
      rafIds.clear();
    }

    function bucketShape(x0: number, y0: number, label: string): SVGGElement {
      const g = svgEl('g');
      g.setAttribute('transform', `translate(${x0},${y0})`);
      g.appendChild(
        svgEl('path', {
          d: 'M0 0 L0 120 L80 120 L80 0',
          fill: 'none',
          stroke: token('--anim-edge-idle'),
          'stroke-width': 2,
        }),
      );
      const t = svgEl('text', {
        x: 40,
        y: -10,
        'text-anchor': 'middle',
        fill: token('--anim-text-muted'),
        'font-size': 11,
        'font-family': 'JetBrains Mono, monospace',
      });
      t.textContent = label;
      g.appendChild(t);
      return g;
    }

    let tbG: SVGGElement;
    let lbG: SVGGElement;

    function buildBuckets(): void {
      svg.innerHTML = '';
      tbG = bucketShape(60, 70, 'token bucket (cap 10, refill 2/s)');
      svg.appendChild(tbG);
      lbG = bucketShape(290, 70, 'leaky bucket (leak 2/s)');
      svg.appendChild(lbG);
    }

    function drawTokens(): void {
      tbG.querySelectorAll('.bucket-token').forEach((n) => n.remove());
      for (let i = 0; i < tbCount; i++) {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const c = svgEl('circle', {
          cx: 14 + col * 18,
          cy: 108 - row * 18,
          r: 6,
          fill: token('--anim-compare'),
        });
        c.classList.add('bucket-token');
        tbG.appendChild(c);
      }
      lbG.querySelectorAll('.bucket-water').forEach((n) => n.remove());
      const h = (lbLevel / LB_CAP) * 116;
      const w = svgEl('rect', {
        x: 2,
        y: 118 - h,
        width: 76,
        height: h,
        fill: token('--anim-compare'),
        opacity: 0.55,
      });
      w.classList.add('bucket-water');
      lbG.appendChild(w);

      readout.innerHTML = '';
      readout.appendChild(htmlEl('span', {}, `TB tokens: ${tbCount}/${TB_CAP}`));
      readout.appendChild(htmlEl('span', {}, `LB level: ${lbLevel.toFixed(1)}/${LB_CAP}`));
      readout.appendChild(htmlEl('span', {}, `allowed: ${allowed}`));
      readout.appendChild(htmlEl('span', {}, `denied: ${denied}`));
    }

    function flashReq(parent: SVGGElement, ok: boolean): void {
      const dot = svgEl('circle', {
        cx: -20,
        cy: 60,
        r: 7,
        fill: ok ? token('--anim-success') : token('--anim-danger'),
        opacity: 0,
      });
      parent.appendChild(dot);
      const start = performance.now();
      const targetX = ok ? 100 : -30;
      const step = (t: number): void => {
        if (paused) {
          dot.remove();
          return;
        }
        const u = Math.min(1, (t - start) / 500);
        dot.setAttribute('cx', String(-20 + (targetX - -20) * u));
        dot.setAttribute('opacity', String(u < 0.2 ? u * 5 : 1 - (u - 0.2) * 1.25));
        if (u < 1) {
          const id = requestAnimationFrame(step);
          rafIds.add(id);
        } else {
          dot.remove();
        }
      };
      const id = requestAnimationFrame(step);
      rafIds.add(id);
    }

    function sendOne(): void {
      const okTB = tbCount > 0;
      if (okTB) {
        tbCount--;
        allowed++;
      } else {
        denied++;
      }
      const okLB = lbLevel < LB_CAP;
      if (okLB) lbLevel = Math.min(LB_CAP, lbLevel + 1);
      flashReq(tbG, okTB);
      flashReq(lbG, okLB);
      drawTokens();
    }

    function burst(n: number): void {
      let i = 0;
      const id = setInterval(() => {
        if (paused) {
          clearInterval(id);
          timers.delete(id);
          return;
        }
        sendOne();
        i++;
        if (i >= n) {
          clearInterval(id);
          timers.delete(id);
        }
      }, 90);
      timers.add(id);
    }

    function startRefill(): void {
      const id = setInterval(() => {
        if (paused) return;
        tbCount = Math.min(TB_CAP, tbCount + 1);
        if (lbLevel > 0) lbLevel = Math.max(0, lbLevel - 1);
        drawTokens();
      }, 500);
      timers.add(id);
    }

    function resetState(): void {
      tbCount = 5;
      lbLevel = 0;
      allowed = 0;
      denied = 0;
      drawTokens();
    }

    controls.appendChild(makeBtn('send 1 request', () => sendOne(), { primary: true }));
    controls.appendChild(makeBtn('send burst (10)', () => burst(10)));
    controls.appendChild(makeBtn('send burst (20)', () => burst(20)));
    controls.appendChild(makeBtn('reset', resetState));

    const offTheme = onThemeChange(() => {
      buildBuckets();
      drawTokens();
    });
    buildBuckets();
    drawTokens();
    startRefill();

    return {
      pause(): void {
        paused = true;
        clearTimers();
      },
      resume(): void {
        if (!paused) return;
        paused = false;
        startRefill();
      },
      reset(): void {
        clearTimers();
        paused = false;
        resetState();
        startRefill();
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

export default bucket;
