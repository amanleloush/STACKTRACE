// Build-time shaping for the /revise/ pages: turns a note or DSA entry's
// raw MDX into the handful of pieces a revision sheet shows (one-liner,
// definition, cheat sheet, anchors). Pure, so it can be unit-tested
// without `astro:content`; the pages pass in `{ id, data, body }`.

import {
  definitionSection,
  findSection,
  inlineCodeHtml,
  oneLinerHtml,
  sections,
} from '~/lib/content-extract';

export interface ReviseTopic {
  slug: string;
  title: string;
  /** Page the title links to, e.g. `/learn/notes/<slug>/`. */
  href: string;
  /** "Read the full note" target: the TL;DR (notes) or explanation (DSA) anchor. */
  fullHref: string;
  /** Anchor id of this topic's block on the revision page. */
  anchor: string;
  oneLinerHtml: string;
  /** Definition / explanation HTML with the one-liner paragraph removed
   *  (it is already shown on its own above). Empty when missing. */
  definitionHtml: string;
  /** Notes only: TL;DR cheat-sheet HTML. */
  cheatSheetHtml: string;
  /** DSA only. */
  complexity?: { time: string; space: string };
  /** DSA only, rendered with inline-code semantics. */
  pitfallsHtml: string[];
}

export interface EntryLike {
  id: string;
  body?: string;
  data: {
    title: string;
    order: number;
    premium?: boolean;
    complexity?: { time: string; space: string };
    commonPitfalls?: string[];
  };
}

/** Remove the `<p><strong>One-liner:</strong> …</p>` paragraph. */
export function stripOneLiner(html: string): string {
  return html.replace(/<p><strong>One-liner:<\/strong>[\s\S]*?<\/p>\s*/g, '').trim();
}

/** Revision-page anchor for a topic: prefixed so it can't collide with
 *  ids inside the injected section HTML. */
export const topicAnchor = (slug: string): string => `rv-${slug}`;

export function noteTopic(entry: EntryLike): ReviseTopic {
  const body = entry.body ?? '';
  const all = sections(body);
  const def = definitionSection(all);
  const tldr = findSection(all, /^TL;DR/);
  const href = `/learn/notes/${entry.id}/`;
  // Premium notes stay behind the paywall: show only the one-liner.
  const locked = entry.data.premium === true;
  return {
    slug: entry.id,
    title: entry.data.title,
    href,
    fullHref: tldr ? `${href}#${tldr.id}` : href,
    anchor: topicAnchor(entry.id),
    oneLinerHtml: oneLinerHtml(body) ?? '',
    definitionHtml: locked || !def ? '' : stripOneLiner(def.html),
    cheatSheetHtml: locked || !tldr ? '' : tldr.html,
    pitfallsHtml: [],
  };
}

export function dsaTopic(entry: EntryLike): ReviseTopic {
  const body = entry.body ?? '';
  const all = sections(body);
  const def = definitionSection(all);
  const href = `/learn/dsa/${entry.id}/`;
  const locked = entry.data.premium === true;
  return {
    slug: entry.id,
    title: entry.data.title,
    href,
    fullHref: def ? `${href}#${def.id}` : href,
    anchor: topicAnchor(entry.id),
    oneLinerHtml: oneLinerHtml(body) ?? '',
    definitionHtml: locked || !def ? '' : stripOneLiner(def.html),
    cheatSheetHtml: '',
    complexity: entry.data.complexity,
    pitfallsHtml: locked ? [] : (entry.data.commonPitfalls ?? []).map(inlineCodeHtml),
  };
}

/** Sort by frontmatter `order`, then slug so ties are deterministic. */
export function byOrder<T extends { id: string; data: { order: number } }>(a: T, b: T): number {
  return a.data.order - b.data.order || a.id.localeCompare(b.id);
}

/** Previous / next items around `slug` in an ordered list. */
export function neighbours<T extends { slug: string }>(
  list: readonly T[],
  slug: string,
): { prev: T | null; next: T | null } {
  const i = list.findIndex((p) => p.slug === slug);
  if (i < 0) return { prev: null, next: null };
  return { prev: list[i - 1] ?? null, next: list[i + 1] ?? null };
}
