// Build-time: turns notes into mock-round problems (brief, 60-second answer,
// TL;DR) using content-extract, so the page never re-renders a whole note.
// Pure apart from content-extract, so tests can feed it raw MDX.

import { definitionSection, findSection, sections, type Section } from '~/lib/content-extract';
import type { Mode } from './mock-logic';

export const HLD_PHASE = '07-hld-problems';
export const LLD_PHASE = '14-lld';

export interface NoteInput {
  slug: string;
  title: string;
  phase: string;
  order: number;
  premium: boolean;
  body: string;
}

/** Index entry, embedded in the page for the picker. */
export interface ProblemSummary {
  slug: string;
  title: string;
  mode: Mode;
}

/** Full problem, served from /mock/problems.json. */
export interface MockProblem extends ProblemSummary {
  briefHeading: string;
  briefHtml: string;
  /** Empty for premium notes: the reveal links to the note instead. */
  definitionHtml: string;
  tldrHtml: string;
}

/** HLD: every note in the HLD-problems phase. LLD: the `lld-*` problem
 *  notes (including the mocks), not the pattern/strategy notes. */
export function modeFor(n: Pick<NoteInput, 'phase' | 'slug'>): Mode | null {
  if (n.phase === HLD_PHASE) return 'hld';
  if (n.phase === LLD_PHASE && n.slug.startsWith('lld-')) return 'lld';
  return null;
}

/** "Problem statement", else the mocks' "The problem", else the first
 *  section that isn't the definition (which would give the answer away). */
export function briefSection(all: Section[]): Section | undefined {
  const def = definitionSection(all);
  return (
    findSection(all, /^Problem statement$/i) ??
    findSection(all, /^The problem$/i) ??
    all.find((s) => s !== def && !/^TL;DR/.test(s.heading))
  );
}

/** Problem statements often end with the reference architecture as a
 *  mermaid block, which would give the design away (and the site shows
 *  mermaid as raw source anyway), so the brief drops them. */
export function stripMermaid(html: string): string {
  return html.replace(/<pre><code class="language-mermaid">[\s\S]*?<\/code><\/pre>\n?/g, '');
}

export function buildProblem(n: NoteInput): MockProblem | null {
  const mode = modeFor(n);
  if (!mode) return null;
  const all = sections(n.body);
  const brief = briefSection(all);
  const def = definitionSection(all);
  const tldr = findSection(all, /^TL;DR/);
  return {
    slug: n.slug,
    title: n.title,
    mode,
    briefHeading: brief?.heading ?? 'Problem',
    briefHtml: stripMermaid(brief?.html ?? ''),
    definitionHtml: n.premium ? '' : (def?.html ?? ''),
    tldrHtml: n.premium ? '' : (tldr?.html ?? ''),
  };
}

/** All mock problems, HLD then LLD, each in curriculum order. */
export function buildProblems(notes: NoteInput[]): MockProblem[] {
  return [...notes]
    .sort((a, b) => a.order - b.order)
    .map(buildProblem)
    .filter((p): p is MockProblem => p !== null)
    .sort((a, b) => (a.mode === b.mode ? 0 : a.mode === 'hld' ? -1 : 1));
}
