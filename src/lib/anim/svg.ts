// SVG / DOM helpers shared by every animation.
// Ported and generalized from Brain-Detox-Arc/docs/javascripts/animations.js lines 10–62.

export const SVG_NS = 'http://www.w3.org/2000/svg';

export function svgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {},
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

export function htmlEl<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {},
  text?: string,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = String(v);
    else if (k.startsWith('on')) (el as unknown as Record<string, unknown>)[k] = v;
    else el.setAttribute(k, String(v));
  }
  if (text !== undefined) el.textContent = text;
  return el;
}

/** FNV-1a 32-bit hash — used for deterministic coloring. */
export function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface AnimFrame {
  host: HTMLElement;
  stage: HTMLDivElement;
  controls: HTMLDivElement;
  readout: HTMLDivElement;
}

/**
 * Build the standard `.anim` shell (header / stage / controls / readout)
 * inside `host`. Returns the inner regions so the animation can mount
 * its SVG into `stage`, buttons into `controls`, and labels into `readout`.
 */
export function buildFrame(
  host: HTMLElement,
  opts: { title: string; caption?: string; badge?: string },
): AnimFrame {
  host.innerHTML = '';
  host.classList.add('anim');

  const header = htmlEl('div', { class: 'anim__header' });
  header.appendChild(htmlEl('h3', { class: 'anim__title' }, opts.title));
  if (opts.badge) header.appendChild(htmlEl('span', { class: 'anim__badge' }, opts.badge));
  host.appendChild(header);

  if (opts.caption) host.appendChild(htmlEl('p', { class: 'anim__caption' }, opts.caption));

  const stage = htmlEl('div', { class: 'anim__stage' });
  host.appendChild(stage);

  const controls = htmlEl('div', { class: 'anim__controls' });
  host.appendChild(controls);

  const readout = htmlEl('div', { class: 'anim__readout' });
  host.appendChild(readout);

  return { host, stage, controls, readout };
}

/** Button factory matching the shared control bar style. */
export function makeBtn(
  label: string,
  onClick: () => void,
  opts: { primary?: boolean; ariaLabel?: string } = {},
): HTMLButtonElement {
  const b = htmlEl('button', {
    class: 'anim__btn' + (opts.primary ? ' anim__btn--primary' : ''),
    type: 'button',
  }, label);
  if (opts.ariaLabel) b.setAttribute('aria-label', opts.ariaLabel);
  b.addEventListener('click', onClick);
  return b;
}

export function makeSlider(opts: {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
}): HTMLLabelElement {
  const wrap = htmlEl('label', { class: 'anim__slider' });
  wrap.appendChild(document.createTextNode(opts.label + ' '));
  const input = htmlEl('input', {
    type: 'range',
    min: opts.min,
    max: opts.max,
    step: opts.step ?? 1,
    value: opts.value,
  });
  const valueLabel = htmlEl('span', {}, String(opts.value));
  input.addEventListener('input', () => {
    const v = Number(input.value);
    valueLabel.textContent = String(v);
    opts.onChange(v);
  });
  wrap.appendChild(input);
  wrap.appendChild(valueLabel);
  return wrap;
}
