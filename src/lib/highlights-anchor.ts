// Text-quote anchoring for highlights, as pure functions over strings.
//
// A page's "text" is the concatenation of its article body's text nodes
// (highlights-dom.ts decides which nodes count). A highlight is stored as a
// text-quote selector (the W3C Web Annotation idea):
//   exact   the selected text, whitespace collapsed
//   prefix  up to 32 chars of text just before it
//   suffix  up to 32 chars just after it
//   heading id of the nearest preceding heading
//   pos     its offset in the page text when it was made (a hint)
//
// To re-find it: every occurrence of `exact` (compared with whitespace runs
// collapsed, so line wrapping / indentation changes don't matter) is a
// candidate; the best one has the longest matching prefix + suffix context,
// then the same heading, then the closest position. A note edited around
// the highlight still finds it (context only ranks candidates); if `exact`
// is gone it is "detached" — the caller keeps it and lists it, never drops
// it.

import { CONTEXT_CHARS, MAX_EXACT_CHARS } from './highlights';

export interface TextQuote {
  exact: string;
  prefix: string;
  suffix: string;
  heading: string;
  pos: number;
}

export interface HeadingMark {
  id: string;
  /** Offset in the page text where the heading starts. */
  offset: number;
}

export interface Span {
  start: number;
  end: number;
}

/** Collapse every whitespace run to one space. */
export const collapse = (s: string): string => s.replace(/\s+/g, ' ');

/**
 * `text` with whitespace runs collapsed, plus `map[i]` = the index in `text`
 * of normalized char `i` (so matches map back to raw offsets).
 */
export function normalizeWithMap(text: string): { norm: string; map: number[] } {
  let norm = '';
  const map: number[] = [];
  let inSpace = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (/\s/.test(ch)) {
      if (inSpace) continue;
      inSpace = true;
      norm += ' ';
    } else {
      inSpace = false;
      norm += ch;
    }
    map.push(i);
  }
  return { norm, map };
}

/** Id of the last heading at or before `offset` ('' if none). */
export function headingAt(headings: readonly HeadingMark[], offset: number): string {
  let id = '';
  for (const h of headings) {
    if (h.offset > offset) break;
    id = h.id;
  }
  return id;
}

/**
 * The selector for `text[start, end)`, with leading / trailing whitespace
 * trimmed off the span. Null when the span holds no text or is longer than
 * MAX_EXACT_CHARS (after collapsing).
 */
export function describeSpan(
  text: string,
  start: number,
  end: number,
  headings: readonly HeadingMark[] = [],
): (TextQuote & Span) | null {
  let s = Math.max(0, Math.min(start, text.length));
  let e = Math.max(s, Math.min(end, text.length));
  while (s < e && /\s/.test(text[s]!)) s++;
  while (e > s && /\s/.test(text[e - 1]!)) e--;
  if (s >= e) return null;
  const exact = collapse(text.slice(s, e));
  if (exact.length > MAX_EXACT_CHARS) return null;
  const prefix = collapse(text.slice(Math.max(0, s - CONTEXT_CHARS * 4), s)).slice(-CONTEXT_CHARS);
  const suffix = collapse(text.slice(e, e + CONTEXT_CHARS * 4)).slice(0, CONTEXT_CHARS);
  return { exact, prefix, suffix, heading: headingAt(headings, s), pos: s, start: s, end: e };
}

/** Matching chars of `want`'s tail against `norm` just before `at`. */
function prefixScore(norm: string, at: number, want: string): number {
  let n = 0;
  for (let i = want.length - 1, j = at - 1; i >= 0 && j >= 0; i--, j--) {
    if (want[i] !== norm[j]) break;
    n++;
  }
  return n;
}

/** Matching chars of `want`'s head against `norm` from `at`. */
function suffixScore(norm: string, at: number, want: string): number {
  let n = 0;
  for (let i = 0, j = at; i < want.length && j < norm.length; i++, j++) {
    if (want[i] !== norm[j]) break;
    n++;
  }
  return n;
}

/** Bound on candidates scored, so a one-letter highlight can't stall the page. */
const MAX_CANDIDATES = 2000;

/**
 * Where `q` sits in `text` now, as raw offsets — or null when its exact
 * text no longer appears (the highlight is detached).
 */
export function findQuote(text: string, q: TextQuote, headings: readonly HeadingMark[] = []): Span | null {
  const exact = collapse(q.exact).trim();
  if (exact === '') return null;
  const { norm, map } = normalizeWithMap(text);
  // Context is compared in collapsed form too; a leading/trailing space on
  // either side is incidental.
  const prefix = collapse(q.prefix);
  const suffix = collapse(q.suffix);

  let best: Span | null = null;
  let bestScore = -Infinity;
  let found = 0;
  for (let i = norm.indexOf(exact); i !== -1 && found < MAX_CANDIDATES; i = norm.indexOf(exact, i + 1)) {
    found++;
    const start = map[i]!;
    const end = map[i + exact.length - 1]! + 1;
    const ctx = prefixScore(norm, i, prefix) + suffixScore(norm, i + exact.length, suffix);
    const sameHeading = q.heading !== '' && headingAt(headings, start) === q.heading ? 8 : 0;
    // Distance only breaks ties: always < 1.
    const dist = Math.abs(start - q.pos) / (text.length + 1);
    const score = ctx * 2 + sameHeading - dist;
    if (score > bestScore) {
      bestScore = score;
      best = { start, end };
    }
  }
  return best;
}
