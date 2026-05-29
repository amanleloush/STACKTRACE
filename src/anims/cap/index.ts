import type { AnimModule, AnimHandle } from '~/lib/anim/types';
import { buildFrame, svgEl, htmlEl, makeBtn } from '~/lib/anim/svg';
import { token, onThemeChange } from '~/lib/anim/theme';
import meta from './meta';

// Ported from Brain-Detox-arc/docs/javascripts/animations.js:850-917.
const cap: AnimModule = {
  ...meta,

  mount(host): AnimHandle {
    const { stage, controls, readout } = buildFrame(host, {
      title: meta.title,
      caption: meta.caption,
      badge: 'Interactive',
    });

    const svg = svgEl('svg', {
      viewBox: '0 0 460 240',
      width: 460,
      style: 'max-width:100%;height:auto;',
    });
    stage.appendChild(svg);

    let linkUp = true;
    let mode: 'CP' | 'AP' = 'CP';
    let primaryValue = 5;
    let replicaValue = 5;

    const modeBtns: HTMLButtonElement[] = [];

    function svgText(x: number, y: number, str: string, fill: string, bold: boolean, mono: boolean): SVGTextElement {
      const t = svgEl('text', {
        x,
        y,
        'text-anchor': 'middle',
        fill,
        'font-size': mono ? 11 : 13,
        'font-family': mono ? 'JetBrains Mono, monospace' : 'inherit',
      });
      if (bold) t.setAttribute('font-weight', '700');
      t.textContent = str;
      return t;
    }

    function link(p: { x: number; y: number }, q: { x: number; y: number }): SVGLineElement {
      return svgEl('line', {
        x1: p.x,
        y1: p.y,
        x2: q.x,
        y2: q.y,
        stroke: linkUp ? token('--anim-edge-up') : token('--anim-edge-down'),
        'stroke-width': 2,
        'stroke-dasharray': linkUp ? '0' : '6 4',
        opacity: linkUp ? 0.9 : 0.7,
      });
    }

    function node(p: { x: number; y: number }, role: string, value: number, ok: boolean): SVGGElement {
      const g = svgEl('g');
      g.appendChild(
        svgEl('circle', {
          cx: p.x,
          cy: p.y,
          r: 28,
          fill: ok ? token('--anim-success') : token('--anim-danger'),
        }),
      );
      g.appendChild(svgText(p.x, p.y + 4, role, '#fff', true, false));
      g.appendChild(svgText(p.x, p.y + 50, `value=${value}`, token('--anim-text-muted'), false, true));
      return g;
    }

    function draw(): void {
      svg.innerHTML = '';
      const A = { x: 120, y: 120 };
      const B = { x: 330, y: 80 };
      const C = { x: 330, y: 180 };

      svg.appendChild(link(A, B));
      svg.appendChild(link(A, C));
      svg.appendChild(link(B, C));

      svg.appendChild(node(A, 'primary', primaryValue, true));
      svg.appendChild(node(B, 'replica-1', linkUp ? primaryValue : replicaValue, linkUp || mode === 'AP'));
      svg.appendChild(node(C, 'replica-2', linkUp ? primaryValue : replicaValue, linkUp || mode === 'AP'));

      const status = svgEl('text', {
        x: 230,
        y: 220,
        'text-anchor': 'middle',
        fill: token('--anim-text-muted'),
        'font-size': 12,
      });
      if (linkUp) status.textContent = 'network healthy · all reads consistent';
      else if (mode === 'CP') status.textContent = 'partition · CP mode → replicas refuse reads/writes';
      else status.textContent = 'partition · AP mode → replicas serve possibly-stale value';
      svg.appendChild(status);

      readout.innerHTML = '';
      readout.appendChild(htmlEl('span', {}, `link: ${linkUp ? 'up' : 'down'}`));
      readout.appendChild(htmlEl('span', {}, `mode: ${mode}`));
      readout.appendChild(htmlEl('span', {}, `primary: ${primaryValue}`));
      readout.appendChild(htmlEl('span', {}, `replicas: ${linkUp ? primaryValue : replicaValue}`));
    }

    controls.appendChild(
      makeBtn('drop network', () => {
        linkUp = false;
        replicaValue = primaryValue;
        draw();
      }),
    );
    controls.appendChild(
      makeBtn('heal network', () => {
        linkUp = true;
        replicaValue = primaryValue;
        draw();
      }),
    );
    controls.appendChild(
      makeBtn(
        'write to primary',
        () => {
          primaryValue = Math.floor(Math.random() * 100);
          if (linkUp) replicaValue = primaryValue;
          draw();
        },
        { primary: true },
      ),
    );

    const cpBtn = makeBtn('CP mode', () => {
      mode = 'CP';
      for (const b of modeBtns) b.setAttribute('aria-pressed', String(b === cpBtn));
      draw();
    });
    cpBtn.setAttribute('aria-pressed', 'true');
    modeBtns.push(cpBtn);
    controls.appendChild(cpBtn);

    const apBtn = makeBtn('AP mode', () => {
      mode = 'AP';
      for (const b of modeBtns) b.setAttribute('aria-pressed', String(b === apBtn));
      draw();
    });
    apBtn.setAttribute('aria-pressed', 'false');
    modeBtns.push(apBtn);
    controls.appendChild(apBtn);

    const offTheme = onThemeChange(() => draw());
    draw();

    return {
      pause(): void {
        /* static */
      },
      resume(): void {
        /* static */
      },
      reset(): void {
        linkUp = true;
        mode = 'CP';
        primaryValue = 5;
        replicaValue = 5;
        cpBtn.setAttribute('aria-pressed', 'true');
        apBtn.setAttribute('aria-pressed', 'false');
        draw();
      },
      destroy(): void {
        offTheme();
        host.innerHTML = '';
      },
    };
  },
};

export default cap;
