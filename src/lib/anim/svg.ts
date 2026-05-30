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

// ============================================================================
// Step-driven anim helpers — match the brain-detox dsa-viz engine's UX so the
// native and bridged anims feel identical: Play/Pause + Step + Reset + speed
// selector + optional right-side pseudocode panel with line highlight.
// ============================================================================

/**
 * Attach a pseudocode panel to the right of the stage. Wraps the existing
 * `.anim__stage` and the new code panel in a flex row.
 *
 * Returns a `highlight(lineIdx)` function — call it from your render loop
 * to spotlight the line corresponding to the current animation step.
 */
export function attachCodePanel(
  frame: AnimFrame,
  opts: { lines: string[]; header?: string },
): { highlight(lineIdx: number | null): void } {
  const { host, stage } = frame;
  // Move stage into a flex row alongside the code panel. The stage already
  // lives inside `host` directly; wrap both in a body div.
  const body = htmlEl('div', { class: 'anim__body' });
  host.insertBefore(body, stage);
  body.appendChild(stage);

  const codeWrap = htmlEl('div', { class: 'anim__codewrap' });
  codeWrap.appendChild(htmlEl('div', { class: 'anim__codehead' }, opts.header ?? 'PSEUDOCODE'));
  const pre = htmlEl('pre', { class: 'anim__code' });
  const lineEls: HTMLElement[] = [];
  opts.lines.forEach((line, i) => {
    const row = htmlEl('div', { class: 'anim__codeline' });
    const num = htmlEl('span', { class: 'anim__lineno' }, String(i + 1).padStart(2, ' '));
    const text = htmlEl('span', { class: 'anim__linetext' }, line);
    row.appendChild(num);
    row.appendChild(text);
    pre.appendChild(row);
    lineEls.push(row);
  });
  codeWrap.appendChild(pre);
  body.appendChild(codeWrap);

  return {
    highlight(idx: number | null): void {
      for (let i = 0; i < lineEls.length; i++) {
        if (i === idx) lineEls[i]!.classList.add('is-active');
        else lineEls[i]!.classList.remove('is-active');
      }
    },
  };
}

export interface StepRunnerHandle {
  /** Current cursor position (0-indexed). */
  getCursor(): number;
  /** Programmatically advance one step. Pauses playback. */
  stepOnce(): void;
  /** Snap to step 0, regenerate, replay from start. Pauses. */
  reset(): void;
  /** Stop the playback timer. UI button label flips to "Play". */
  pause(): void;
  /** Start the playback timer. */
  play(): void;
  /** Full teardown — clear timer, remove DOM, dispose any internal state. */
  destroy(): void;
}

const SPEED_PRESETS: Array<{ label: string; ms: number }> = [
  { label: 'slow', ms: 1100 },
  { label: 'normal', ms: 620 },
  { label: 'fast', ms: 280 },
  { label: 'max', ms: 110 },
];

/**
 * Build the standardized Play/Pause + Step + Reset + Speed selector cluster
 * inside `controls`, bound to a step cursor. The caller owns the steps
 * array (or generator) — this helper just drives the cursor and invokes
 * `onStep` to repaint.
 *
 * Pass `prefersReducedMotion` to skip to the final step on play.
 */
export function attachStepRunner(opts: {
  controls: HTMLElement;
  totalSteps: () => number;
  onStep: (cursor: number) => void;
  onReset?: () => void;
  initialSpeed?: 'slow' | 'normal' | 'fast' | 'max';
  prefersReducedMotion?: boolean;
}): StepRunnerHandle {
  let cursor = 0;
  let playing = false;
  let speedMs = SPEED_PRESETS.find((p) => p.label === (opts.initialSpeed ?? 'normal'))!.ms;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let runToken = 0;

  function clearTimer(): void {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function tick(): void {
    if (!playing) return;
    if (cursor >= opts.totalSteps() - 1) {
      playing = false;
      updatePlayLabel();
      return;
    }
    cursor++;
    opts.onStep(cursor);
    timer = setTimeout(tick, speedMs);
  }

  function play(): void {
    if (opts.prefersReducedMotion) {
      cursor = opts.totalSteps() - 1;
      opts.onStep(cursor);
      playing = false;
      updatePlayLabel();
      return;
    }
    if (cursor >= opts.totalSteps() - 1) cursor = 0;
    playing = true;
    runToken++;
    const myRun = runToken;
    clearTimer();
    const loop = (): void => {
      if (myRun !== runToken) return;
      tick();
    };
    loop();
    updatePlayLabel();
  }

  function pause(): void {
    playing = false;
    clearTimer();
    updatePlayLabel();
  }

  function stepOnce(): void {
    pause();
    if (cursor < opts.totalSteps() - 1) cursor++;
    opts.onStep(cursor);
  }

  function reset(): void {
    pause();
    cursor = 0;
    if (opts.onReset) opts.onReset();
    opts.onStep(cursor);
  }

  // Build the button cluster.
  const playBtn = makeBtn('▶ Play', () => (playing ? pause() : play()), { primary: true });
  const stepBtn = makeBtn('Step ›', stepOnce);
  const resetBtn = makeBtn('Reset', reset);
  opts.controls.appendChild(playBtn);
  opts.controls.appendChild(stepBtn);
  opts.controls.appendChild(resetBtn);

  // Speed selector (slow / normal / fast / max — matches brain-detox engine).
  const speedWrap = htmlEl('div', { class: 'anim__speed' });
  for (const preset of SPEED_PRESETS) {
    const b = htmlEl(
      'button',
      {
        class:
          'anim__sbtn' +
          (preset.label === (opts.initialSpeed ?? 'normal') ? ' is-active' : ''),
        type: 'button',
      },
      preset.label,
    );
    b.addEventListener('click', () => {
      speedMs = preset.ms;
      speedWrap.querySelectorAll('.anim__sbtn').forEach((x) => x.classList.remove('is-active'));
      b.classList.add('is-active');
    });
    speedWrap.appendChild(b);
  }
  opts.controls.appendChild(speedWrap);

  function updatePlayLabel(): void {
    playBtn.textContent = playing ? '⏸ Pause' : '▶ Play';
  }

  // Initial paint.
  opts.onStep(cursor);

  return {
    getCursor: () => cursor,
    stepOnce,
    reset,
    pause,
    play,
    destroy(): void {
      runToken++;
      clearTimer();
    },
  };
}
