// Build-time builder for the one-liner review cards (/review/cards.json):
// one card per note ("Explain in one line: <title>") and per DSA page ("How do you
// solve <title>?"), backed by the page's `**One-liner:**` as HTML. Guide
// pages ("The short version", no one-liner) get no card. Kept
// free of `astro:content` so tests can feed it plain entries.

import { oneLinerHtml } from './content-extract';
import { NOTES_PHASES } from './notes-phases';
import { PHASES as DSA_PHASES } from './dsa-phases';
import type { OneLinerCard } from './review-schedule';

export interface ContentEntry {
  id: string;
  body?: string;
  data: { title: string; phase: string; order: number };
}

/** Cards in course order: notes phases, then DSA phases, each by `order`. */
export function buildOneLinerCards(notes: ContentEntry[], dsa: ContentEntry[]): OneLinerCard[] {
  const out: OneLinerCard[] = [];
  // Pattern cheat sheets are concepts ("what is a sliding window?"), not
  // problems to solve, so they get the notes-style prompt.
  const frontFor = (pillar: 'notes' | 'dsa', e: ContentEntry): string =>
    pillar === 'notes' || /-cheatsheet$/.test(e.id)
      ? `Explain in one line: ${e.data.title.replace(/\s*cheat\s*sheet\s*$/i, '')}`
      : `How do you solve ${e.data.title}?`;
  const add = (entries: ContentEntry[], pillar: 'notes' | 'dsa', phaseOrder: string[]): void => {
    const rank = (p: string): number => {
      const i = phaseOrder.indexOf(p);
      return i < 0 ? phaseOrder.length : i;
    };
    const sorted = [...entries].sort(
      (a, b) =>
        rank(a.data.phase) - rank(b.data.phase) ||
        a.data.phase.localeCompare(b.data.phase) ||
        a.data.order - b.data.order ||
        a.id.localeCompare(b.id),
    );
    for (const e of sorted) {
      const back = oneLinerHtml(e.body ?? '');
      if (!back) continue;
      out.push({
        id: `${pillar === 'notes' ? 'n' : 'd'}:${e.id}`,
        phase: `${pillar}/${e.data.phase}`,
        title: e.data.title,
        front: frontFor(pillar, e),
        backHtml: back,
        href: `/learn/${pillar}/${encodeURIComponent(e.id)}/`,
      });
    }
  };
  add(notes, 'notes', NOTES_PHASES.map((p) => p.slug));
  add(dsa, 'dsa', DSA_PHASES.map((p) => p.slug));
  return out;
}
