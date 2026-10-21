// Highlights and personal page notes on note and DSA pages.
//
// Pure contract shared by the browser store (highlights-store.ts), the API
// route (/api/v1/highlights) and the /highlights/ page: key rules, entry
// coercion, request-body validation, the caps, and the grouping / search /
// Markdown export used by /highlights/. KV access lives in highlights-kv.ts
// and the text-quote anchoring in highlights-anchor.ts, so this module
// stays safe to ship to the client.
//
// One map, two kinds of entry, merged last-write-wins on `updatedAt`
// (lww.ts):
//   h:<id>            → a highlight (text-quote selector + colour + note)
//   p:<pillar>:<slug> → the free-text "My notes" for one page
// Removing a highlight keeps the entry as a tombstone (`deleted: true`, text
// fields emptied) so another device's older copy can't bring it back. An
// emptied page note is its own tombstone (text '').
//
// Everything in here is user text: it is rendered with textContent only and
// never logged.

export const HL_COLORS = ['yellow', 'green', 'blue', 'pink'] as const;
export type HlColor = (typeof HL_COLORS)[number];

/** `notes:<slug>` or `dsa:<slug>` — the same page keys as completion. */
export const PAGE_RE = /^(?:notes|dsa):[a-z0-9-]{1,120}$/;
/** Highlight ids: random, lowercase base36. */
export const HL_ID_RE = /^[a-z0-9]{8,24}$/;
const KEY_RE = /^(?:h:[a-z0-9]{8,24}|p:(?:notes|dsa):[a-z0-9-]{1,120})$/;

/** Most live highlights one account may keep. */
export const MAX_HIGHLIGHTS = 5000;
/** Entries in the stored doc: highlights + page notes + tombstones. */
export const MAX_DOC_ENTRIES = 10_000;
/** Characters of a highlight's own note. */
export const MAX_NOTE_CHARS = 2000;
/** Characters of a page's "My notes". */
export const MAX_PAGE_NOTE_CHARS = 20_000;
/** Characters of highlighted text; longer selections are refused. */
export const MAX_EXACT_CHARS = 2000;
/** Characters of quote context kept on each side. */
export const CONTEXT_CHARS = 32;
/** Characters of a heading id. */
export const MAX_HEADING_CHARS = 200;
/** Most entries in one batch PUT. */
export const MAX_BATCH_ENTRIES = 200;
/** Cap on the serialized per-user doc (UTF-8 bytes). 5,000 typical
 *  highlights (~150 chars + a short note) come to ~2 MiB; this leaves room
 *  for long notes. KV's own value limit is 25 MiB. */
export const MAX_DOC_BYTES = 4 * 1024 * 1024;
/** Cap on a batch PUT body (UTF-8 bytes). */
export const MAX_BATCH_BODY_BYTES = 1024 * 1024;
/** How far ahead of the server clock a timestamp may be. */
export const MAX_CLOCK_SKEW_MS = 10 * 60 * 1000;

export interface HighlightEntry {
  kind: 'hl';
  /** `notes:<slug>` / `dsa:<slug>` */
  page: string;
  color: HlColor;
  /** The highlighted text, whitespace collapsed. */
  exact: string;
  /** Up to CONTEXT_CHARS of text before / after it. */
  prefix: string;
  suffix: string;
  /** id of the nearest preceding heading ('' = before the first one). */
  heading: string;
  /** Character offset in the page text when it was made (a hint only). */
  pos: number;
  note: string;
  /** The page last failed to find the text (see highlights-anchor.ts). */
  detached: boolean;
  deleted: boolean;
  createdAt: number;
  /** Unix ms of the last change, client clock. Drives last-write-wins. */
  updatedAt: number;
}

export interface PageNoteEntry {
  kind: 'page';
  page: string;
  /** '' = cleared (a tombstone). */
  text: string;
  updatedAt: number;
}

export type HlEntry = HighlightEntry | PageNoteEntry;
export type HlMap = Record<string, HlEntry>;

export function isValidHlKey(key: unknown): key is string {
  return typeof key === 'string' && KEY_RE.test(key);
}
export const isValidPage = (page: unknown): page is string => typeof page === 'string' && PAGE_RE.test(page);
export const highlightKey = (id: string): string => `h:${id}`;
export const pageNoteKey = (page: string): string => `p:${page}`;
export const isColor = (c: unknown): c is HlColor => typeof c === 'string' && (HL_COLORS as readonly string[]).includes(c);

/** The entry's kind/page agree with the key it is stored under. */
export function entryMatchesKey(key: string, e: HlEntry): boolean {
  if (e.kind === 'hl') return key.startsWith('h:') && HL_ID_RE.test(key.slice(2));
  return key === pageNoteKey(e.page);
}

/** A fresh random highlight id (12 base36 chars). */
export function newHighlightId(rand: () => number = Math.random): string {
  const a = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < 12; i++) s += a[Math.floor(rand() * a.length) % a.length];
  return s;
}

// --- Coercion (storage / network → entry) ---------------------------------------

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.trunc(v)) : 0);
const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.slice(0, max) : '');

/**
 * Lenient read of a stored entry (localStorage or server JSON): repairs
 * types, truncates over-long text, drops what can't be repaired. Never
 * throws.
 */
export function coerceHlEntry(raw: unknown): HlEntry | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (!isValidPage(r.page)) return null;
  const updatedAt = num(r.updatedAt);
  if (r.kind === 'page') {
    return { kind: 'page', page: r.page, text: str(r.text, MAX_PAGE_NOTE_CHARS), updatedAt };
  }
  if (r.kind !== 'hl') return null;
  const deleted = r.deleted === true;
  const exact = str(r.exact, MAX_EXACT_CHARS);
  // A live highlight with no text can never be anchored or shown.
  if (!deleted && exact.trim() === '') return null;
  return {
    kind: 'hl',
    page: r.page,
    color: isColor(r.color) ? r.color : 'yellow',
    exact: deleted ? '' : exact,
    prefix: deleted ? '' : str(r.prefix, CONTEXT_CHARS),
    suffix: deleted ? '' : str(r.suffix, CONTEXT_CHARS),
    heading: deleted ? '' : str(r.heading, MAX_HEADING_CHARS),
    pos: deleted ? 0 : num(r.pos),
    note: deleted ? '' : str(r.note, MAX_NOTE_CHARS),
    detached: !deleted && r.detached === true,
    deleted,
    createdAt: num(r.createdAt),
    updatedAt,
  };
}

// --- Strict validation (PUT bodies) ----------------------------------------------

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

const isStamp = (v: unknown, min: number): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= min;
const isStr = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max;

/** Strict validation of one entry under `key`. Errors never echo values. */
export function parseHlEntry(key: string, body: unknown, now: number = Date.now()): ParseResult<HlEntry> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, error: 'entry must be a JSON object' };
  }
  const b = body as Record<string, unknown>;
  if (!isValidPage(b.page)) return { ok: false, error: 'page must look like notes:<slug> or dsa:<slug>' };
  if (!isStamp(b.updatedAt, 1)) return { ok: false, error: 'updatedAt must be a positive integer (unix ms)' };
  if (b.updatedAt > now + MAX_CLOCK_SKEW_MS) return { ok: false, error: 'timestamp is too far in the future' };

  if (b.kind === 'page') {
    if (key !== pageNoteKey(b.page)) return { ok: false, error: 'page note key must be p:<page>' };
    if (!isStr(b.text, MAX_PAGE_NOTE_CHARS)) {
      return { ok: false, error: `text must be a string of at most ${MAX_PAGE_NOTE_CHARS} characters` };
    }
    return { ok: true, value: { kind: 'page', page: b.page, text: b.text, updatedAt: b.updatedAt } };
  }
  if (b.kind !== 'hl') return { ok: false, error: 'kind must be "hl" or "page"' };
  if (!key.startsWith('h:')) return { ok: false, error: 'highlight key must be h:<id>' };
  if (typeof b.deleted !== 'boolean') return { ok: false, error: 'deleted must be a boolean' };
  if (!isStamp(b.createdAt, 0) || b.createdAt > now + MAX_CLOCK_SKEW_MS) {
    return { ok: false, error: 'createdAt must be a non-negative integer (unix ms)' };
  }
  if (b.deleted) {
    // Tombstones carry no text.
    return {
      ok: true,
      value: {
        kind: 'hl', page: b.page, color: isColor(b.color) ? b.color : 'yellow',
        exact: '', prefix: '', suffix: '', heading: '', pos: 0, note: '',
        detached: false, deleted: true, createdAt: b.createdAt, updatedAt: b.updatedAt,
      },
    };
  }
  if (!isColor(b.color)) return { ok: false, error: `color must be one of ${HL_COLORS.join(', ')}` };
  if (!isStr(b.exact, MAX_EXACT_CHARS) || b.exact.trim() === '') {
    return { ok: false, error: `exact must be 1..${MAX_EXACT_CHARS} characters` };
  }
  if (!isStr(b.prefix, CONTEXT_CHARS) || !isStr(b.suffix, CONTEXT_CHARS)) {
    return { ok: false, error: `prefix and suffix must be at most ${CONTEXT_CHARS} characters` };
  }
  if (!isStr(b.heading, MAX_HEADING_CHARS)) return { ok: false, error: 'heading must be a short string' };
  if (!isStamp(b.pos, 0)) return { ok: false, error: 'pos must be a non-negative integer' };
  if (!isStr(b.note, MAX_NOTE_CHARS)) {
    return { ok: false, error: `note must be a string of at most ${MAX_NOTE_CHARS} characters` };
  }
  if (typeof b.detached !== 'boolean') return { ok: false, error: 'detached must be a boolean' };
  return {
    ok: true,
    value: {
      kind: 'hl', page: b.page, color: b.color, exact: b.exact, prefix: b.prefix, suffix: b.suffix,
      heading: b.heading, pos: b.pos, note: b.note, detached: b.detached, deleted: false,
      createdAt: b.createdAt, updatedAt: b.updatedAt,
    },
  };
}

/**
 * Validate a batch PUT body: `{ entries: { [key]: HlEntry } }` with
 * 1..MAX_BATCH_ENTRIES entries. Errors name the key, never other values.
 */
export function parseBatchBody(body: unknown, now: number = Date.now()): ParseResult<HlMap> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, error: 'body must be a JSON object' };
  }
  const entries = (body as Record<string, unknown>).entries;
  if (typeof entries !== 'object' || entries === null || Array.isArray(entries)) {
    return { ok: false, error: 'entries must be an object keyed by h:<id> or p:<page>' };
  }
  const keys = Object.keys(entries);
  if (keys.length === 0) return { ok: false, error: 'entries must not be empty' };
  if (keys.length > MAX_BATCH_ENTRIES) return { ok: false, error: `at most ${MAX_BATCH_ENTRIES} entries per request` };
  const out: HlMap = {};
  for (const key of keys) {
    if (!isValidHlKey(key)) return { ok: false, error: 'every key must look like h:<id> or p:<pillar>:<slug>' };
    const r = parseHlEntry(key, (entries as Record<string, unknown>)[key], now);
    if (!r.ok) return { ok: false, error: `${key}: ${r.error}` };
    out[key] = r.value;
  }
  return { ok: true, value: out };
}

// --- Local edits -------------------------------------------------------------------

/** `updatedAt` for an edit: strictly increasing per key even if the clock steps back. */
export const nextStamp = (prev: { updatedAt: number } | null | undefined, now: number = Date.now()): number =>
  Math.max(now, (prev?.updatedAt ?? 0) + 1);

/** The tombstone that replaces a removed highlight. */
export function tombstone(prev: HighlightEntry, now: number = Date.now()): HighlightEntry {
  return {
    ...prev,
    exact: '', prefix: '', suffix: '', heading: '', pos: 0, note: '',
    detached: false, deleted: true, updatedAt: nextStamp(prev, now),
  };
}

/** Live highlights in the map (tombstones and page notes left out). */
export function liveHighlights(map: HlMap): Array<HighlightEntry & { id: string }> {
  const out: Array<HighlightEntry & { id: string }> = [];
  for (const [key, e] of Object.entries(map)) {
    if (e.kind !== 'hl' || e.deleted || !entryMatchesKey(key, e)) continue;
    out.push({ ...e, id: key.slice(2) });
  }
  return out;
}

export const countLive = (map: HlMap): number => liveHighlights(map).length;

/** Order on a page: reading position, then age. */
export const byPosition = (a: HighlightEntry, b: HighlightEntry): number => a.pos - b.pos || a.createdAt - b.createdAt;

// --- /highlights/ grouping, search and export --------------------------------------

export interface PageMeta {
  title: string;
  href: string;
  /** Phase slug, e.g. `03-databases`. */
  phase: string;
}

export interface PhaseMeta {
  pillar: 'notes' | 'dsa';
  slug: string;
  num: string;
  title: string;
}

export interface PageGroup {
  page: string;
  title: string;
  href: string;
  note: string;
  highlights: Array<HighlightEntry & { id: string }>;
}

export interface PhaseGroup {
  /** `<pillar>/<phase>`, or `other` for pages no longer on the site. */
  key: string;
  title: string;
  pages: PageGroup[];
}

export interface GroupFilter {
  /** Case-insensitive substring over text, notes and page titles. */
  query?: string;
  /** Only these colours; empty / undefined = every colour + page notes. */
  colors?: ReadonlySet<HlColor>;
}

/** Fallback page link when the page isn't in the site metadata. */
export function pageHref(page: string): string {
  const [pillar, slug] = page.split(':');
  return `/learn/${pillar}/${slug}/`;
}

/** Link that scrolls to and flashes one highlight. */
export const highlightHref = (href: string, id: string): string => `${href}#hl-${id}`;

/**
 * Everything in `map`, grouped by phase (site order) and then page (reading
 * order), after the search / colour filter. Groups left empty are dropped.
 */
export function groupHighlights(
  map: HlMap,
  pages: Record<string, PageMeta>,
  phases: PhaseMeta[],
  filter: GroupFilter = {},
): PhaseGroup[] {
  const q = (filter.query ?? '').trim().toLowerCase();
  const colors = filter.colors && filter.colors.size > 0 ? filter.colors : null;
  const has = (s: string) => q === '' || s.toLowerCase().includes(q);

  const byPage = new Map<string, PageGroup>();
  const pageGroup = (page: string): PageGroup => {
    let g = byPage.get(page);
    if (!g) {
      const meta = pages[page];
      g = { page, title: meta?.title ?? page.split(':')[1] ?? page, href: meta?.href ?? pageHref(page), note: '', highlights: [] };
      byPage.set(page, g);
    }
    return g;
  };

  for (const [key, e] of Object.entries(map)) {
    if (!entryMatchesKey(key, e)) continue;
    const title = pages[e.page]?.title ?? '';
    if (e.kind === 'page') {
      if (colors || e.text.trim() === '') continue;
      if (has(e.text) || has(title)) pageGroup(e.page).note = e.text;
      continue;
    }
    if (e.deleted) continue;
    if (colors && !colors.has(e.color)) continue;
    if (!(has(e.exact) || has(e.note) || has(title))) continue;
    pageGroup(e.page).highlights.push({ ...e, id: key.slice(2) });
  }

  const phaseOrder = new Map(phases.map((p, i) => [`${p.pillar}/${p.slug}`, i]));
  const phaseTitle = new Map(phases.map((p) => [`${p.pillar}/${p.slug}`, `${p.pillar === 'dsa' ? 'DSA' : 'System design'} · ${p.num} ${p.title}`]));
  const groups = new Map<string, PhaseGroup>();
  for (const g of byPage.values()) {
    if (g.note === '' && g.highlights.length === 0) continue;
    g.highlights.sort(byPosition);
    const meta = pages[g.page];
    const pk = meta ? `${g.page.split(':')[0]}/${meta.phase}` : 'other';
    const key = phaseOrder.has(pk) ? pk : 'other';
    let pg = groups.get(key);
    if (!pg) {
      pg = { key, title: phaseTitle.get(key) ?? 'Other pages', pages: [] };
      groups.set(key, pg);
    }
    pg.pages.push(g);
  }
  const order = (k: string) => phaseOrder.get(k) ?? Number.MAX_SAFE_INTEGER;
  const out = [...groups.values()].sort((a, b) => order(a.key) - order(b.key));
  for (const g of out) g.pages.sort((a, b) => a.title.localeCompare(b.title));
  return out;
}

const oneLine = (s: string) => s.replace(/\s+/g, ' ').trim();
const quote = (s: string) =>
  s
    .split(/\r?\n/)
    .map((l) => `> ${l}`.trimEnd())
    .join('\n');

/** The grouped highlights as a Markdown document. `origin` makes links absolute. */
export function toMarkdown(groups: PhaseGroup[], origin: string, exportedOn: string): string {
  const out: string[] = ['# My StackTrace highlights', '', `_Exported ${exportedOn}_`, ''];
  if (groups.length === 0) out.push('No highlights or notes yet.', '');
  for (const g of groups) {
    out.push(`## ${oneLine(g.title)}`, '');
    for (const p of g.pages) {
      out.push(`### [${oneLine(p.title).replace(/[[\]]/g, '\\$&')}](${origin}${p.href})`, '');
      if (p.note.trim() !== '') out.push('**My notes**', '', quote(p.note.trim()), '');
      for (const h of p.highlights) {
        const tags = [h.color, ...(h.detached ? ['detached'] : [])].join(', ');
        out.push(`- “${oneLine(h.exact)}” _(${tags})_ — [open](${origin}${highlightHref(p.href, h.id)})`);
        if (h.note.trim() !== '') out.push(`  - Note: ${oneLine(h.note)}`);
      }
      out.push('');
    }
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}
