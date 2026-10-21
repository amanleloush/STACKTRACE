// Client-side Mermaid rendering for note pages and revision sheets.
//
// MDX leaves ```mermaid fences out of Shiki, so they reach the page as a
// plain `<pre><code class="language-mermaid">` (content-extract's HTML for
// /revise/ is the same shape). This module finds those blocks, loads the
// `mermaid` package with a dynamic import only when at least one exists,
// and swaps each block for an SVG. The original <pre> moves into a
// "View source" <details> so the text stays copyable and readable by
// screen readers. With JS off, or if a diagram fails to parse, the code
// block simply stays where it was.
//
// The theme follows `data-theme` on <html>; a MutationObserver re-renders
// every diagram when the site's theme toggle flips it.

type MermaidApi = typeof import('mermaid')['default'];

const SELECTOR = 'pre > code.language-mermaid';

interface Diagram {
  source: string;
  /** Holds the SVG; created only once a render has succeeded. */
  figure: HTMLElement | null;
  canvas: HTMLElement | null;
  /** The original code block, left in place until the first success. */
  pre: HTMLPreElement;
}

const diagrams: Diagram[] = [];
let mermaidPromise: Promise<MermaidApi> | null = null;
let renderedTheme: string | null = null;
let queue: Promise<void> = Promise.resolve();
let seq = 0;

function currentTheme(): 'dark' | 'light' {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

function loadMermaid(): Promise<MermaidApi> {
  mermaidPromise ??= import('mermaid').then((m) => m.default);
  return mermaidPromise;
}

function configure(mermaid: MermaidApi, theme: 'dark' | 'light'): void {
  mermaid.initialize({
    startOnLoad: false,
    // Strict: no click handlers or scripts, labels are sanitised.
    securityLevel: 'strict',
    theme: theme === 'dark' ? 'dark' : 'default',
    // Draw at natural size; wide diagrams scroll inside .mmd__canvas
    // instead of shrinking to an unreadable width on phones.
    flowchart: { useMaxWidth: false },
    sequence: { useMaxWidth: false },
    class: { useMaxWidth: false },
    state: { useMaxWidth: false },
    er: { useMaxWidth: false },
    gantt: { useMaxWidth: false },
    journey: { useMaxWidth: false },
    // A broken diagram must not leave mermaid's "Syntax error" bomb SVG
    // in the page; we keep the code block instead.
    suppressErrorRendering: true,
  });
}

/** Wrap a successfully rendered block: figure > canvas + details(pre). */
function mount(d: Diagram): void {
  if (d.figure) return;
  const figure = document.createElement('figure');
  figure.className = 'mmd';
  const canvas = document.createElement('div');
  canvas.className = 'mmd__canvas';
  // The canvas scrolls horizontally, so keyboard users must reach it.
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'group');
  canvas.setAttribute('aria-label', 'Diagram (source below)');
  const details = document.createElement('details');
  details.className = 'mmd__src';
  const summary = document.createElement('summary');
  summary.textContent = 'View source';
  d.pre.replaceWith(figure);
  details.append(summary, d.pre);
  figure.append(canvas, details);
  d.figure = figure;
  d.canvas = canvas;
}

async function renderOne(mermaid: MermaidApi, d: Diagram): Promise<void> {
  const id = `mmd-${++seq}`;
  try {
    const { svg, bindFunctions } = await mermaid.render(id, d.source);
    mount(d);
    if (!d.canvas) return;
    d.canvas.innerHTML = svg;
    bindFunctions?.(d.canvas);
  } catch {
    // Content bug in the diagram source: keep the code block as is.
    // Deliberately log no source text or error detail.
    console.warn('mermaid: a diagram could not be rendered; showing its source instead');
    // mermaid renders into a temporary node under <body>; make sure no
    // leftovers survive a failed render. (On success the SVG carrying
    // `id` now lives in the canvas, so this must not run then.)
    document.getElementById(id)?.remove();
    document.getElementById(`d${id}`)?.remove();
  }
}

function renderAll(): Promise<void> {
  // Renders share mermaid's global config, so run passes one at a time.
  queue = queue.then(async () => {
    const theme = currentTheme();
    if (theme === renderedTheme) return;
    const mermaid = await loadMermaid();
    configure(mermaid, theme);
    for (const d of diagrams) await renderOne(mermaid, d);
    renderedTheme = theme;
  }).catch(() => {
    // The chunk failed to load (offline, blocked): code blocks remain.
    mermaidPromise = null;
  });
  return queue;
}

let observing = false;

/** Find mermaid blocks under `root` and render them. Safe to call again. */
export function initMermaid(root: ParentNode = document): void {
  let found = false;
  root.querySelectorAll<HTMLElement>(SELECTOR).forEach((code) => {
    const pre = code.parentElement as HTMLPreElement;
    if (pre.dataset.mmd) return;
    pre.dataset.mmd = '1';
    diagrams.push({ source: code.textContent ?? '', figure: null, canvas: null, pre });
    found = true;
  });
  if (!found) return;
  // New blocks need a pass even if the theme hasn't changed.
  renderedTheme = null;
  void renderAll();
  if (observing) return;
  observing = true;
  new MutationObserver(() => {
    if (currentTheme() !== renderedTheme) void renderAll();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}
