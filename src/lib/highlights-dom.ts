// Browser-only DOM side of highlights: which text in the article counts,
// selection → offsets, and wrapping / unwrapping `<mark>`s.
//
// The page text is the concatenation of the article body's text nodes,
// skipping interactive or generated regions (IGNORE_SELECTOR) — code blocks,
// Mermaid diagrams, code tabs, quizzes, practice toggles, paywalls, heading
// `¶` anchors, our own UI. Those regions are left out both when a highlight
// is made and when it is re-found, so offsets stay consistent; a selection
// that lies entirely inside one is ignored. Inserting marks never changes
// the text, so the index is simply rebuilt after each DOM change.

import type { HeadingMark, Span } from './highlights-anchor';
import type { HlColor } from './highlights';

export const IGNORE_SELECTOR = [
  'pre',
  'script',
  'style',
  'noscript',
  'template',
  'svg',
  'canvas',
  'button',
  'textarea',
  'input',
  'select',
  '.mmd',
  '.ct',
  '.quiz',
  '.mcq',
  '.practice',
  '.qa',
  '.paywall',
  '.note__heading-anchor',
  '.hl-ui',
  '[data-hl-ignore]',
].join(',');

const HEADING_RE = /^H[1-6]$/;

export interface TextIndex {
  text: string;
  nodes: Array<{ node: Text; start: number }>;
  headings: HeadingMark[];
}

/** Index the countable text under `root`. */
export function buildIndex(root: Element): TextIndex {
  const nodes: TextIndex['nodes'] = [];
  const headings: HeadingMark[] = [];
  let text = '';
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      if (n.nodeType === Node.TEXT_NODE) return NodeFilter.FILTER_ACCEPT;
      const el = n as Element;
      if (el.matches(IGNORE_SELECTOR)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_SKIP;
    },
  });
  // FILTER_SKIP still descends, but skipped elements are never returned,
  // so headings are found by checking each text node's heading ancestor.
  let lastHeading: Element | null = null;
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n as Text;
    const h = t.parentElement?.closest('h1,h2,h3,h4,h5,h6');
    if (h && h !== lastHeading && root.contains(h) && h.id && HEADING_RE.test(h.tagName)) {
      lastHeading = h;
      headings.push({ id: h.id, offset: text.length });
    }
    nodes.push({ node: t, start: text.length });
    text += t.data;
  }
  return { text, nodes, headings };
}

/** True when `node` sits inside an ignored region under `root`. */
export function isIgnored(node: Node, root: Element): boolean {
  const el = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  const hit = el?.closest(IGNORE_SELECTOR);
  return !!hit && root.contains(hit);
}

/** The selection's span in the index, or null if it covers no countable text. */
export function rangeToSpan(index: TextIndex, range: Range): Span | null {
  let start = -1;
  let end = -1;
  for (const { node, start: at } of index.nodes) {
    if (!range.intersectsNode(node)) continue;
    const s = node === range.startContainer ? range.startOffset : 0;
    const e = node === range.endContainer ? range.endOffset : node.data.length;
    if (e <= s) continue;
    if (start < 0) start = at + s;
    end = at + e;
  }
  return start >= 0 && end > start ? { start, end } : null;
}

export const markSelector = (id: string): string => `mark.hl[data-hl-id="${id}"]`;

/**
 * Wrap `span` in `<mark class="hl hl--<color>" data-hl-id>` elements: one
 * per text node it touches (text nodes are split at the edges), so ranges
 * that cross element boundaries never re-parent elements. Whitespace-only
 * pieces are skipped — they may sit where a <mark> isn't allowed (between
 * table rows or list items). Returns the marks, in document order.
 */
export function wrapSpan(index: TextIndex, span: Span, id: string, color: HlColor): HTMLElement[] {
  const pieces: Text[] = [];
  for (const { node, start } of index.nodes) {
    const len = node.data.length;
    const s = Math.max(span.start - start, 0);
    const e = Math.min(span.end - start, len);
    if (s >= e) continue;
    if (node.data.slice(s, e).trim() === '') continue;
    let target = node;
    if (e < len) target.splitText(e);
    if (s > 0) target = target.splitText(s);
    pieces.push(target);
  }
  const marks: HTMLElement[] = [];
  for (const t of pieces) {
    const mark = document.createElement('mark');
    mark.className = `hl hl--${color}`;
    mark.dataset.hlId = id;
    t.parentNode!.insertBefore(mark, t);
    mark.appendChild(t);
    marks.push(mark);
  }
  return marks;
}

/** Remove a highlight's marks, leaving their text in place. */
export function unwrap(root: Element, id: string): void {
  const parents = new Set<Node>();
  for (const mark of root.querySelectorAll(markSelector(id))) {
    const parent = mark.parentNode;
    if (!parent) continue;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
    parents.add(parent);
  }
  for (const p of parents) p.normalize();
}

export function recolor(root: Element, id: string, color: HlColor): void {
  for (const mark of root.querySelectorAll<HTMLElement>(markSelector(id))) {
    mark.className = `hl hl--${color}`;
  }
}
