// Pure helpers for the company-wise DSA dataset.
//
// Consumed by scripts/import-company-problems.ts (build-time import from
// liquidslr/leetcode-company-wise-problems) and by the /dsa/companies/*
// pages for the shared types. No imports on purpose: the script runs under
// `node --experimental-strip-types`, which can't resolve `~/` aliases, and
// the pages bundle it through Vite — a dependency-free module works in both.

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

/** Most recent window a problem was reported in, or null if only "All". */
export type RecentWindow = '30d' | '3m' | '6m' | null;

export interface CompanyProblem {
  /** LeetCode slug (`two-sum`) — the global problem key across companies. */
  slug: string;
  title: string;
  difficulty: Difficulty;
  /** Source "Frequency" column (0–100, relative within the company). */
  frequency: number;
  /** Acceptance rate as a percentage, 1 decimal. */
  acceptance: number;
  topics: string[];
  link: string;
  recent: RecentWindow;
}

export interface CompanySummary {
  name: string;
  slug: string;
  /** Problems kept for this company (≤ the import's top-N). */
  problemCount: number;
  /** Problems listed in the source's "All" file before the top-N cut. */
  sourceCount: number;
  easy: number;
  medium: number;
  hard: number;
  /** Kept problems that also appear in a 30-day / 3-month / 6-month file. */
  recent: number;
}

export interface CompanyFile {
  name: string;
  slug: string;
  sourceCount: number;
  problems: CompanyProblem[];
}

export interface ProblemIndexEntry {
  title: string;
  difficulty: Difficulty;
  link: string;
  topics: string[];
  /** Company slugs whose kept top-N list contains this problem. */
  companies: string[];
}

export interface CompaniesIndex {
  source: { repo: string; url: string; commit: string; committedAt: string };
  minProblems: number;
  topN: number;
  companies: CompanySummary[];
}

// --- CSV ---------------------------------------------------------------------

/**
 * Minimal RFC 4180 parser: quoted fields, `""` escapes, commas / newlines
 * inside quotes, CRLF or LF line endings, optional UTF-8 BOM. Returns rows of
 * raw string cells; blank lines are dropped.
 */
export function parseCsv(text: string): string[][] {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  const endRow = (): void => {
    row.push(cell);
    cell = '';
    if (!(row.length === 1 && row[0] === '')) rows.push(row);
    row = [];
  };

  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n') endRow();
    else if (ch === '\r') {
      if (src[i + 1] === '\n') i++;
      endRow();
    } else cell += ch;
  }
  if (cell !== '' || row.length > 0) endRow();
  return rows;
}

/** One parsed + normalized row from a company CSV. */
export interface SourceRow {
  slug: string;
  title: string;
  difficulty: Difficulty;
  frequency: number;
  acceptance: number;
  topics: string[];
}

const DIFFICULTIES: Record<string, Difficulty> = { EASY: 'Easy', MEDIUM: 'Medium', HARD: 'Hard' };

/** Same contract as the server-side progress key — see problem-progress.ts. */
const SLUG_RE = /^[a-z0-9-]{1,120}$/;

/** `https://leetcode.com/problems/two-sum/description` → `two-sum`. */
export function slugFromLink(link: string): string | null {
  const m = /leetcode\.com\/problems\/([^/?#\s]+)/i.exec(link.trim());
  if (!m) return null;
  const slug = m[1]!.toLowerCase();
  return SLUG_RE.test(slug) ? slug : null;
}

/**
 * The source stores acceptance as (percent / 10 000) — Two Sum's 55.8 % shows
 * up as 0.0058. Older dumps used a 0–1 ratio or a plain percentage, so pick
 * the scale by magnitude and clamp to [0, 100].
 */
export function normalizeAcceptance(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  let pct: number;
  if (raw < 0.02) pct = raw * 10_000;
  else if (raw <= 1) pct = raw * 100;
  else pct = raw;
  return Math.round(Math.min(100, pct) * 10) / 10;
}

/**
 * Turn CSV text into normalized rows. Columns are located by header name so
 * a reordered export doesn't silently shift fields. Rows with an unparseable
 * link or difficulty are skipped; duplicate slugs keep the first occurrence.
 */
export function parseCompanyCsv(text: string): SourceRow[] {
  const [header, ...body] = parseCsv(text);
  if (!header) return [];
  const col = (name: string): number =>
    header.findIndex((h) => h.trim().toLowerCase() === name.toLowerCase());
  const iDiff = col('Difficulty');
  const iTitle = col('Title');
  const iFreq = col('Frequency');
  const iAcc = col('Acceptance Rate');
  const iLink = col('Link');
  const iTopics = col('Topics');
  if ([iDiff, iTitle, iFreq, iLink].some((i) => i < 0)) {
    throw new Error(`CSV header missing required columns: ${header.join(',')}`);
  }

  const seen = new Set<string>();
  const out: SourceRow[] = [];
  for (const r of body) {
    const slug = slugFromLink(r[iLink] ?? '');
    const difficulty = DIFFICULTIES[(r[iDiff] ?? '').trim().toUpperCase()];
    if (!slug || !difficulty || seen.has(slug)) continue;
    seen.add(slug);
    const freq = Number.parseFloat(r[iFreq] ?? '');
    const acc = iAcc >= 0 ? Number.parseFloat(r[iAcc] ?? '') : Number.NaN;
    out.push({
      slug,
      title: (r[iTitle] ?? '').trim() || slug,
      difficulty,
      frequency: Number.isFinite(freq) ? Math.round(freq * 10) / 10 : 0,
      acceptance: normalizeAcceptance(acc),
      topics:
        iTopics >= 0
          ? (r[iTopics] ?? '')
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
    });
  }
  return out;
}

// --- Selection ---------------------------------------------------------------

export interface RecentSets {
  d30: Set<string>;
  m3: Set<string>;
  m6: Set<string>;
}

export function recentWindowFor(slug: string, sets: RecentSets): RecentWindow {
  if (sets.d30.has(slug)) return '30d';
  if (sets.m3.has(slug)) return '3m';
  if (sets.m6.has(slug)) return '6m';
  return null;
}

export function problemLink(slug: string): string {
  return `https://leetcode.com/problems/${slug}/`;
}

/**
 * Keep the top `topN` problems by frequency (desc). Ties keep source order —
 * the export is already frequency-sorted, so that's its own tie-break.
 */
export function selectTopProblems(
  rows: SourceRow[],
  sets: RecentSets,
  topN: number,
): CompanyProblem[] {
  return rows
    .map((r, i) => ({ r, i }))
    .sort((a, b) => b.r.frequency - a.r.frequency || a.i - b.i)
    .slice(0, topN)
    .map(({ r }) => ({
      slug: r.slug,
      title: r.title,
      difficulty: r.difficulty,
      frequency: r.frequency,
      acceptance: r.acceptance,
      topics: r.topics,
      link: problemLink(r.slug),
      recent: recentWindowFor(r.slug, sets),
    }));
}

/** Display-name overrides for folders whose names aren't presentation-ready. */
const NAME_OVERRIDES: Record<string, string> = { tcs: 'TCS' };

export function companyDisplayName(folder: string): string {
  return NAME_OVERRIDES[folder] ?? folder;
}

export function companySlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function summarize(file: CompanyFile): CompanySummary {
  const count = (d: Difficulty): number => file.problems.filter((p) => p.difficulty === d).length;
  return {
    name: file.name,
    slug: file.slug,
    problemCount: file.problems.length,
    sourceCount: file.sourceCount,
    easy: count('Easy'),
    medium: count('Medium'),
    hard: count('Hard'),
    recent: file.problems.filter((p) => p.recent !== null).length,
  };
}

/**
 * Cross-company problem index: slug → metadata + every company that kept it.
 * Companies are visited in the given order, so `companies[]` follows it
 * (callers pass them sorted by size). Metadata comes from the first sighting.
 */
export function buildProblemIndex(files: CompanyFile[]): Record<string, ProblemIndexEntry> {
  const out: Record<string, ProblemIndexEntry> = {};
  for (const f of files) {
    for (const p of f.problems) {
      const hit = out[p.slug];
      if (hit) {
        if (!hit.companies.includes(f.slug)) hit.companies.push(f.slug);
        continue;
      }
      out[p.slug] = {
        title: p.title,
        difficulty: p.difficulty,
        link: p.link,
        topics: p.topics,
        companies: [f.slug],
      };
    }
  }
  // Stable key order → stable diffs when the import is re-run.
  return Object.fromEntries(Object.keys(out).sort().map((k) => [k, out[k]!]));
}
