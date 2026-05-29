#!/usr/bin/env node
// Brain-Detox-arc → sysviz-next content port (plan §4, §14l).
// Idempotent: re-running converges. Preserves manual edits to existing
// destination files by merging frontmatter rather than overwriting.
//
// Usage:
//   npm run port            # port everything, fail loud on unresolved links
//   npm run port -- --dry   # do not write any files; just print the report
//   npm run port -- --phase=05-distributed-systems
//
// Output: writes (or refreshes) src/content/notes/<phase>/<slug>.mdx and
// emits port-report.md at repo root.

import fs from 'node:fs/promises';
import path from 'node:path';

const SRC_ROOT = '/Users/darshitjain/Documents/Brain-Detox-arc/docs';
const DST_ROOT = '/Users/darshitjain/Documents/sysviz-next/src/content/notes';
const REPORT_PATH = '/Users/darshitjain/Documents/sysviz-next/port-report.md';

const PHASE_DIRS = [
  '01-foundations',
  '02-databases',
  '03-caching-redis',
  '04-messaging-kafka',
  '05-distributed-systems',
  '06-hld-patterns',
  '07-hld-problems',
  '08-data-engineering',
  '09-production-craft',
  '10-modern-additions',
];

function readFlag(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  if (hit) return hit.slice(prefix.length);
  return process.argv.includes(`--${name}`) ? '' : undefined;
}

const DRY = readFlag('dry') !== undefined;
const STRICT = readFlag('strict') !== undefined || true; // always strict per plan §14l
const PHASE_FILTER = readFlag('phase');

interface SourceFile {
  srcAbs: string;
  srcRel: string;   // relative to SRC_ROOT, used as the slug-map key
  phase: string;
  order: number;
  dstSlug: string;
  dstAbs: string;
}

// ---------------------------------------------------------------------------
// Frontmatter — minimal inline YAML for the constrained schema we emit.
// ---------------------------------------------------------------------------

type FmValue = string | number | boolean | string[];
type Fm = Record<string, FmValue>;

const FM_KEY_ORDER = [
  'title',
  'phase',
  'order',
  'tags',
  'premium',
  'previewParagraphs',
  'estimatedMinutes',
  'prerequisites',
  'summary',
  'draft',
];

function renderFm(o: Fm): string {
  const out: string[] = [];
  const seen = new Set<string>();
  const emit = (k: string): void => {
    if (!(k in o) || seen.has(k)) return;
    seen.add(k);
    const v = o[k]!;
    if (typeof v === 'string') {
      out.push(`${k}: ${JSON.stringify(v)}`);
    } else if (typeof v === 'number' || typeof v === 'boolean') {
      out.push(`${k}: ${v}`);
    } else if (Array.isArray(v)) {
      const inner = v.map((s) => JSON.stringify(s)).join(', ');
      out.push(`${k}: [${inner}]`);
    }
  };
  for (const k of FM_KEY_ORDER) emit(k);
  for (const k of Object.keys(o)) emit(k);
  return out.join('\n');
}

function parseFm(s: string): Fm {
  const out: Fm = {};
  for (const raw of s.split('\n')) {
    const m = raw.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1]!;
    const val = m[2]!.trim();
    if (val === '') continue;
    if (val === 'true') out[key] = true;
    else if (val === 'false') out[key] = false;
    else if (/^-?\d+$/.test(val)) out[key] = parseInt(val, 10);
    else if (val.startsWith('[') && val.endsWith(']')) {
      const inner = val.slice(1, -1).trim();
      if (inner === '') out[key] = [];
      else {
        // Parse a flat array of JSON-quoted strings: "a", "b", "c"
        const items: string[] = [];
        let i = 0;
        while (i < inner.length) {
          while (i < inner.length && /[\s,]/.test(inner[i]!)) i++;
          if (i >= inner.length) break;
          if (inner[i] === '"') {
            let j = i + 1;
            while (j < inner.length && inner[j] !== '"') {
              if (inner[j] === '\\') j++;
              j++;
            }
            items.push(JSON.parse(inner.slice(i, j + 1)));
            i = j + 1;
          } else {
            const next = inner.indexOf(',', i);
            const tok = (next === -1 ? inner.slice(i) : inner.slice(i, next)).trim();
            if (tok) items.push(tok);
            i = next === -1 ? inner.length : next + 1;
          }
        }
        out[key] = items;
      }
    } else if (val.startsWith('"') && val.endsWith('"')) {
      out[key] = JSON.parse(val);
    } else {
      out[key] = val;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Tag inference — coarse buckets per phase + keyword sniffing on title.
// ---------------------------------------------------------------------------

const PHASE_BASE_TAGS: Record<string, string[]> = {
  '01-foundations': [],
  '02-databases': ['db'],
  '03-caching-redis': ['caching'],
  '04-messaging-kafka': ['messaging'],
  '05-distributed-systems': ['distsys'],
  '06-hld-patterns': [],
  '07-hld-problems': [],
  '08-data-engineering': [],
  '09-production-craft': [],
  '10-modern-additions': [],
};

function inferTags(phase: string, title: string): string[] {
  const tags = new Set<string>(PHASE_BASE_TAGS[phase] ?? []);
  const t = title.toLowerCase();
  if (/\b(hash|hashing)\b/.test(t)) tags.add('hashing');
  if (/\bshard/.test(t)) tags.add('sharding');
  if (/\b(rate|throttle|limit)/.test(t)) tags.add('rate-limit');
  if (/\b(network|tcp|udp|http|dns|tls)/.test(t)) tags.add('networking');
  if (/\b(cache|cdn|redis)/.test(t)) tags.add('caching');
  if (/\b(consensus|raft|paxos|quorum)/.test(t)) tags.add('consensus');
  if (/\b(kafka|queue|messaging|pulsar|rabbit|sqs)/.test(t)) tags.add('messaging');
  return [...tags];
}

// ---------------------------------------------------------------------------
// MDX safety — escape characters that MDX's JSX parser misreads inside prose,
// without touching code fences or inline-code spans.
// ---------------------------------------------------------------------------

function mdxSafetyPass(src: string): string {
  // Walk the source, toggling "in code" state on ``` fences and ` inline spans,
  // and only rewrite text in non-code regions.
  const out: string[] = [];
  const lines = src.split('\n');
  let inFence = false;
  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      out.push(line);
      continue;
    }
    if (inFence) { out.push(line); continue; }

    // Honor inline-code spans within the line.
    let rebuilt = '';
    let i = 0;
    while (i < line.length) {
      if (line[i] === '`') {
        // Consume one or more backticks as a span delimiter.
        let ticks = '';
        while (line[i] === '`') { ticks += line[i]!; i++; }
        rebuilt += ticks;
        const end = line.indexOf(ticks, i);
        if (end === -1) { rebuilt += line.slice(i); break; }
        rebuilt += line.slice(i, end + ticks.length);
        i = end + ticks.length;
      } else {
        const ch = line[i]!;
        // Escape `<digit` (MDX reads `<1` as a JSX tag start).
        if (ch === '<' && /\d/.test(line[i + 1] ?? '')) {
          rebuilt += '&lt;';
          i++;
        }
        // Escape `{` and `}` in prose — MDX treats them as JS expression
        // delimiters and barfs on `{code}` etc. Backslash-escape so they
        // render as literal braces.
        else if (ch === '{' || ch === '}') {
          rebuilt += `\\${ch}`;
          i++;
        } else {
          rebuilt += ch;
          i++;
        }
      }
    }
    out.push(rebuilt);
  }
  return out.join('\n');
}

// ---------------------------------------------------------------------------
// Pass 1: discover all source files + build slug map.
// ---------------------------------------------------------------------------

async function discover(): Promise<SourceFile[]> {
  const sources: SourceFile[] = [];
  for (const phase of PHASE_DIRS) {
    if (PHASE_FILTER && phase !== PHASE_FILTER) continue;
    const dir = path.join(SRC_ROOT, phase);
    const entries = await fs.readdir(dir);
    for (const f of entries) {
      if (!f.endsWith('.md') || f === 'index.md') continue;
      const m = f.match(/^(\d+)-(.+)\.md$/);
      if (!m) {
        console.warn(`[skip] ${phase}/${f} — no NN-prefix`);
        continue;
      }
      const order = parseInt(m[1]!, 10);
      const slug = m[2]!;
      sources.push({
        srcAbs: path.join(dir, f),
        srcRel: `${phase}/${f}`,
        phase,
        order,
        dstSlug: slug,
        dstAbs: path.join(DST_ROOT, phase, `${slug}.mdx`),
      });
    }
  }
  return sources;
}

// ---------------------------------------------------------------------------
// Pass 2: port one source file.
// ---------------------------------------------------------------------------

interface PortResult {
  mode: 'new' | 'merge' | 'unchanged' | 'dry';
  src: SourceFile;
  wordCount: number;
  estimatedMinutes: number;
  unresolvedLinks: string[];
  rewrittenAnims: string[];
}

async function portOne(
  src: SourceFile,
  slugMap: Map<string, SourceFile>,
): Promise<PortResult> {
  const raw = await fs.readFile(src.srcAbs, 'utf8');

  // Strip leading frontmatter if present (some files might have one).
  let body = raw;
  let sourceFm: Fm = {};
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (fmMatch) {
    sourceFm = parseFm(fmMatch[1]!);
    body = raw.slice(fmMatch[0].length);
  }
  body = body.replace(/^\s+/, '');

  // Extract H1 + drop it from body (NoteLayout renders the title separately).
  const h1Match = body.match(/^#\s+(.+)$/m);
  let title = (sourceFm.title as string) ?? '';
  if (!title && h1Match) {
    title = h1Match[1]!.trim();
    // Strip leading "NN — " or "NN - " prefix from source titles like
    // "22 — CAP + PACELC + Consistency Models" → "CAP + PACELC + Consistency Models".
    title = title.replace(/^\d+\s*[—–\-]\s*/, '').trim();
  }
  if (!title) title = src.dstSlug.replace(/-/g, ' ');

  if (h1Match) body = body.replace(h1Match[0], '').trimStart();

  // The source notes have a `> Phase N • Topic X • ...` line right after H1.
  // It's redundant with NoteLayout's breadcrumb — drop it.
  body = body.replace(/^>\s+Phase[^\n]*\n+/i, '');

  // Estimate read time from word count.
  const wordCount = body.replace(/```[\s\S]*?```/g, ' ').split(/\s+/).filter(Boolean).length;
  const estimatedMinutes = Math.max(1, Math.round(wordCount / 200));

  // Rewrite internal markdown links: [text](path/to/22-x.md[#anchor]) → [text](/learn/notes/x[#anchor]).
  const unresolvedLinks: string[] = [];
  body = body.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (full, text: string, href: string) => {
    if (/^(https?:|mailto:|tel:|#)/.test(href)) return full;
    if (/\.(png|jpe?g|gif|svg|webp|pdf|mp4|mov)(\?|$|#)/i.test(href)) return full;
    if (!href.includes('.md')) return full; // not a markdown link
    const [pathPart, ...rest] = href.split('#');
    const anchor = rest.length ? `#${rest.join('#')}` : '';
    const linkAbs = path.resolve(path.dirname(src.srcAbs), pathPart!);
    const linkRel = path.relative(SRC_ROOT, linkAbs);
    const target = slugMap.get(linkRel);
    if (!target) {
      unresolvedLinks.push(href);
      return full;
    }
    return `[${text}](/learn/notes/${target.dstSlug}/${anchor})`;
  });

  // Rewrite anim hooks: <div class="sde-anim" data-anim="X"></div> → <Anim id="X" />.
  const rewrittenAnims: string[] = [];
  body = body.replace(
    /<div\s+class=["']sde-anim["']\s+data-anim=["']([^"']+)["']\s*>\s*<\/div>/g,
    (_, animId: string) => {
      rewrittenAnims.push(animId);
      return `<Anim id="${animId}" />`;
    },
  );

  // MDX-safety pass — applies *outside* code fences only.
  // MDX treats `<digit` as the start of a JSX tag and chokes. We see this in
  // patterns like "p99 < 100ms" or "<10 ms". Escape `<` → `&lt;` when it's
  // immediately followed by a digit, but never inside ```fenced``` blocks.
  body = mdxSafetyPass(body);

  // Synthesize frontmatter. existing-dest values win over generated ones,
  // except for phase/order/title which are always re-stamped from source.
  const baseFm: Fm = {
    title,
    phase: src.phase,
    order: src.order,
    tags: inferTags(src.phase, title),
    premium: false,
    previewParagraphs: 4,
    estimatedMinutes,
    prerequisites: [],
  };

  // If destination already exists, merge.
  let destExisting: string | null = null;
  try {
    destExisting = await fs.readFile(src.dstAbs, 'utf8');
  } catch {
    /* doesn't exist */
  }

  let finalFm: Fm = { ...baseFm };
  if (destExisting) {
    const m = destExisting.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (m) {
      const existingFm = parseFm(m[1]!);
      // Preserve manual edits to anything the author may have touched —
      // but ALWAYS re-stamp the source-of-truth fields.
      finalFm = { ...baseFm, ...existingFm };
      finalFm.phase = src.phase;
      finalFm.order = src.order;
      // Title: keep manual edits if present in existing destination.
      if (typeof existingFm.title === 'string' && existingFm.title.length > 0) {
        finalFm.title = existingFm.title;
      } else {
        finalFm.title = title;
      }
      // Auto-derived fields refresh on every run (these don't reward stale data).
      finalFm.estimatedMinutes = estimatedMinutes;
    }
  }

  const candidate = `---\n${renderFm(finalFm)}\n---\n\n${body.trimEnd()}\n`;

  let mode: PortResult['mode'];
  if (DRY) {
    mode = 'dry';
  } else if (destExisting === null) {
    await fs.mkdir(path.dirname(src.dstAbs), { recursive: true });
    await fs.writeFile(src.dstAbs, candidate);
    mode = 'new';
  } else if (destExisting === candidate) {
    mode = 'unchanged';
  } else {
    await fs.writeFile(src.dstAbs, candidate);
    mode = 'merge';
  }

  return { mode, src, wordCount, estimatedMinutes, unresolvedLinks, rewrittenAnims };
}

// ---------------------------------------------------------------------------
// Main.
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const sources = await discover();
  const slugMap = new Map<string, SourceFile>();
  for (const s of sources) slugMap.set(s.srcRel, s);
  console.log(`[port] discovered ${sources.length} source files`);

  const results: PortResult[] = [];
  for (const src of sources) {
    results.push(await portOne(src, slugMap));
  }

  const counts = { new: 0, merge: 0, unchanged: 0, dry: 0 };
  let totalUnresolved = 0;
  for (const r of results) {
    counts[r.mode]++;
    totalUnresolved += r.unresolvedLinks.length;
  }

  const reportLines: string[] = [
    '# Content port report',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Source: ${SRC_ROOT}`,
    `Destination: ${DST_ROOT}`,
    '',
    '## Summary',
    `- New files: ${counts.new}`,
    `- Merged (re-stamped) files: ${counts.merge}`,
    `- Unchanged: ${counts.unchanged}`,
    `- Dry-run: ${counts.dry}`,
    `- Unresolved internal links: **${totalUnresolved}**`,
    '',
    '## Per-file',
    '',
  ];
  for (const r of results) {
    reportLines.push(
      `### ${r.src.phase}/${r.src.dstSlug}.mdx`,
      `- mode: \`${r.mode}\``,
      `- words: ${r.wordCount} (~${r.estimatedMinutes} min)`,
      `- anim hooks rewritten: ${r.rewrittenAnims.length ? r.rewrittenAnims.join(', ') : '—'}`,
      `- unresolved links: ${r.unresolvedLinks.length ? r.unresolvedLinks.join(', ') : '—'}`,
      '',
    );
  }

  if (!DRY) {
    await fs.writeFile(REPORT_PATH, reportLines.join('\n'));
  }

  console.log(
    `[port] ${counts.new} new, ${counts.merge} merged, ${counts.unchanged} unchanged, ${counts.dry} dry-run`,
  );
  console.log(`[port] unresolved internal links: ${totalUnresolved}`);

  if (STRICT && totalUnresolved > 0) {
    console.error(`[port] FAIL — ${totalUnresolved} unresolved links. See port-report.md`);
    process.exit(1);
  }
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
