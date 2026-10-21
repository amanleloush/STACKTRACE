// Build-time helpers that pull structured pieces out of a note's raw MDX
// body: its `##` sections (as HTML, with the same heading ids rehype-slug
// gives the rendered page), the interview-ready one-liner, and every
// <MCQ>. Used by the revision, mock-round, mistakes and search features so
// they never have to re-render a whole note.
//
// Pure: no `astro:content` import, so tests can call it directly.

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import GithubSlugger from 'github-slugger';
import { toString } from 'mdast-util-to-string';
import type { Root, RootContent, Heading } from 'mdast';

export interface Section {
  heading: string;
  /** Matches the id rehype-slug puts on the rendered `<h2>`. */
  id: string;
  html: string;
  /** Plain text of the body (no markup), for search indexing. */
  text: string;
}

export interface ExtractedMcq {
  /** Stable across edits that don't change the question text. */
  id: string;
  q: string;
  options: string[];
  answer: number;
  explanationHtml: string;
}

const parser = unified().use(remarkParse).use(remarkMdx).use(remarkGfm);
const toHtml = unified().use(remarkRehype).use(rehypeStringify);

const isJsx = (n: { type: string }) =>
  n.type === 'mdxJsxFlowElement' ||
  n.type === 'mdxJsxTextElement' ||
  n.type === 'mdxFlowExpression' ||
  n.type === 'mdxTextExpression' ||
  n.type === 'mdxjsEsm';

/** Drop MDX-only nodes (components, expressions, imports) recursively. */
function stripMdx<T extends { children?: unknown[] }>(node: T): T {
  if (!Array.isArray(node.children)) return node;
  const kids = (node.children as { type: string }[])
    .filter((c) => !isJsx(c))
    .map((c) => stripMdx(c as { children?: unknown[] }));
  return { ...node, children: kids };
}

export function mdastToHtml(nodes: RootContent[]): string {
  const root = stripMdx({ type: 'root', children: nodes } as Root);
  return String(toHtml.stringify(toHtml.runSync(root) as never));
}

/** Backtick spans render as code in MCQ text, mirroring MCQ.astro. */
export function inlineCodeHtml(s: string): string {
  const esc = (t: string) =>
    t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  return s
    .split('`')
    .map((t, i) => (i % 2 === 1 ? `<code>${esc(t)}</code>` : esc(t)))
    .join('');
}

/** FNV-1a, 32-bit, base36. Small, deterministic, dependency-free. */
export function hashId(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** The id an MCQ gets on the page: `<note slug>:<hash of question>`. */
export function mcqId(slug: string, q: string): string {
  return `${slug}:${hashId(q.trim())}`;
}

// Pages often ask for sections, one-liner and MCQs of the same note, and
// parsing MDX is the slow part, so trees are cached per body string.
const trees = new Map<string, Root>();

export function parse(body: string): Root {
  let tree = trees.get(body);
  if (!tree) {
    tree = parser.parse(body) as Root;
    trees.set(body, tree);
  }
  return tree;
}

export function sections(body: string): Section[] {
  const tree = parse(body);
  const slugger = new GithubSlugger();
  const out: Section[] = [];
  let cur: { heading: string; id: string; nodes: RootContent[] } | null = null;
  const flush = () => {
    if (!cur) return;
    out.push({
      heading: cur.heading,
      id: cur.id,
      html: mdastToHtml(cur.nodes),
      text: cur.nodes
        .filter((n) => !isJsx(n))
        .map((n) => toString(n))
        .join('\n')
        .trim(),
    });
  };
  for (const node of tree.children) {
    if (node.type === 'heading') {
      // Every heading level consumes a slug, exactly as rehype-slug does.
      const text = toString(node);
      const id = slugger.slug(text);
      if ((node as Heading).depth === 2) {
        flush();
        cur = { heading: text, id, nodes: [] };
        continue;
      }
    }
    cur?.nodes.push(node);
  }
  flush();
  return out;
}

export function findSection(all: Section[], heading: string | RegExp): Section | undefined {
  return all.find((s) =>
    typeof heading === 'string' ? s.heading === heading : heading.test(s.heading),
  );
}

/** The interview-ready section: notes use "Definition (interview-ready)",
 *  DSA pages "Interview-ready explanation". */
export function definitionSection(all: Section[]): Section | undefined {
  return findSection(all, /^(Definition \(interview-ready\)|Interview-ready explanation)$/);
}

/** Guides (strategy / how-to / reference pages that nobody is asked to
 *  "define") open with "The short version" instead of a definition and
 *  have no one-liner. */
export function shortVersionSection(all: Section[]): Section | undefined {
  return findSection(all, /^The short version$/);
}

export function isGuide(all: Section[]): boolean {
  return shortVersionSection(all) !== undefined;
}

/** Text after the `**One-liner:**` label of the definition section. */
export function oneLiner(body: string): string | undefined {
  const m = body.match(/^\*\*One-liner:\*\*\s*(.+)$/m);
  return m?.[1]?.trim();
}

/** One-liner as HTML (inline markdown such as `code` and **bold** kept). */
export function oneLinerHtml(body: string): string | undefined {
  const line = oneLiner(body);
  if (!line) return undefined;
  const tree = parse(line);
  const html = mdastToHtml(tree.children);
  return html.replace(/^<p>|<\/p>$/g, '');
}

function attr(node: { attributes?: unknown[] }, name: string): unknown {
  const a = (node.attributes as { type: string; name: string; value: unknown }[] | undefined)?.find(
    (x) => x.type === 'mdxJsxAttribute' && x.name === name,
  );
  if (!a) return undefined;
  if (typeof a.value === 'string' || a.value == null) return a.value;
  // Expression attribute, e.g. options={["a", "b"]} or answer={2}.
  return JSON.parse((a.value as { value: string }).value);
}

export function mcqs(slug: string, body: string): ExtractedMcq[] {
  const out: ExtractedMcq[] = [];
  const walk = (node: { type: string; name?: string; children?: unknown[] }) => {
    if (node.type === 'mdxJsxFlowElement' && node.name === 'MCQ') {
      const q = attr(node as never, 'q') as string;
      const options = attr(node as never, 'options') as string[];
      const answer = attr(node as never, 'answer') as number;
      if (typeof q !== 'string' || !Array.isArray(options) || typeof answer !== 'number') {
        throw new Error(`${slug}: malformed <MCQ>`);
      }
      out.push({
        id: mcqId(slug, q),
        q,
        options,
        answer,
        explanationHtml: mdastToHtml((node.children ?? []) as RootContent[]),
      });
      return;
    }
    for (const c of node.children ?? []) walk(c as never);
  };
  walk(parse(body) as never);
  return out;
}
