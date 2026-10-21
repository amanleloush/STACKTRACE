// Pure helpers for the build-time search index (scripts/build-search-index.ts).
//
// /learn/notes/* and /learn/dsa/* are Worker-rendered, so they never land
// in dist/ as HTML and Pagefind can't crawl them. Instead we read the MDX
// straight from src/content and hand Pagefind:
//   - one page-level record per page (title, summary, one-liner), as a
//     tiny HTML doc so the title sits in an <h1> and gets Pagefind's
//     heading weight. Title searches then rank the page first.
//   - one custom record per `##` section, pointing at the section anchor.
//
// No fs here, so tests can call everything directly.

import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { oneLiner, sections } from '../src/lib/content-extract.ts';

export type Kind = 'Note' | 'DSA';

export interface PageSource {
  kind: Kind;
  /** Path relative to the collection base, e.g. `04-messaging-kafka/kafka-consumer-groups.mdx`. */
  file: string;
  raw: string;
}

export interface PageRecord {
  url: string;
  /** Minimal HTML document for `index.addHTMLFile`. */
  html: string;
}

export interface SectionRecord {
  url: string;
  content: string;
  language: 'en';
  meta: Record<string, string>;
  filters: Record<string, string[]>;
}

export interface PageRecords {
  page: PageRecord;
  sections: SectionRecord[];
}

export interface Frontmatter {
  title: string;
  summary?: string;
  draft: boolean;
  premium: boolean;
}

/** Same flat slug rule as src/content.config.ts: the file basename. */
export function slugFor(file: string): string {
  return path.basename(file, path.extname(file));
}

/** Split `---\n<yaml>\n---\n<body>`. Throws on a missing or invalid block. */
export function splitFrontmatter(raw: string): { data: Frontmatter; body: string } {
  const text = raw.replace(/\r\n/g, '\n');
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) throw new Error('missing frontmatter');
  const y = parseYaml(m[1]!) as Record<string, unknown> | null;
  if (!y || typeof y.title !== 'string' || !y.title) throw new Error('frontmatter has no title');
  return {
    data: {
      title: y.title,
      summary: typeof y.summary === 'string' ? y.summary : undefined,
      draft: y.draft === true,
      premium: y.premium === true,
    },
    body: text.slice(m[0].length),
  };
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const squash = (s: string) => s.replace(/\s+/g, ' ').trim();

/** Strip `**bold**` / `code` markers from the one-liner for plain text. */
const plainInline = (s: string) => s.replace(/\*\*|__|`/g, '');

/** Records for one page, or null for drafts. */
export function buildPageRecords(src: PageSource): PageRecords | null {
  const { data, body } = splitFrontmatter(src.raw);
  if (data.draft) return null;
  const slug = slugFor(src.file);
  const base = src.kind === 'Note' ? `/learn/notes/${slug}/` : `/learn/dsa/${slug}/`;
  const line = oneLiner(body);

  // The kind is carried both as meta (for the result label) and as a
  // filter (so the UI could narrow to Notes or DSA later).
  const page: PageRecord = {
    url: base,
    html: [
      '<html lang="en"><head>',
      `<title>${esc(data.title)}</title>`,
      `<meta data-pagefind-meta="kind:${src.kind}">`,
      `<meta data-pagefind-meta="page:${esc(data.title)}">`,
      `<meta data-pagefind-filter="type:${src.kind}">`,
      '</head><body>',
      `<h1>${esc(data.title)}</h1>`,
      data.summary ? `<p>${esc(data.summary)}</p>` : '',
      line ? `<p>${esc(plainInline(line))}</p>` : '',
      '</body></html>',
    ].join(''),
  };

  // Premium notes keep their title/summary findable but don't leak the
  // gated body through search excerpts. (Today no page is premium.)
  const secs = data.premium
    ? []
    : sections(body)
        .map((s) => ({ s, text: squash(s.text) }))
        .filter(({ text }) => text.length > 0)
        .map(({ s, text }) => ({
          url: `${base}#${s.id}`,
          content: `${s.heading}. ${text}`,
          language: 'en' as const,
          meta: {
            title: `${data.title} › ${s.heading}`,
            page: data.title,
            section: s.heading,
            kind: src.kind,
          },
          filters: { type: [src.kind] },
        }));

  return { page, sections: secs };
}
