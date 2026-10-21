import { describe, it, expect } from 'vitest';
import type { KVNamespace } from '~/lib/kv';
import { applyLwwBatch, mergeLww } from '~/lib/lww';
import {
  coerceHlEntry,
  countLive,
  entryMatchesKey,
  groupHighlights,
  isValidHlKey,
  liveHighlights,
  newHighlightId,
  nextStamp,
  parseBatchBody,
  parseHlEntry,
  tombstone,
  toMarkdown,
  CONTEXT_CHARS,
  MAX_BATCH_ENTRIES,
  MAX_CLOCK_SKEW_MS,
  MAX_EXACT_CHARS,
  MAX_NOTE_CHARS,
  MAX_PAGE_NOTE_CHARS,
  type HighlightEntry,
  type HlMap,
  type PageMeta,
  type PageNoteEntry,
  type PhaseMeta,
} from '~/lib/highlights';
import { collapse, describeSpan, findQuote, headingAt, normalizeWithMap } from '~/lib/highlights-anchor';
import { highlightsDoc } from '~/lib/highlights-kv';
import { GET, PUT } from '~/pages/api/v1/highlights/index';

class FakeKV implements KVNamespace {
  store = new Map<string, string>();
  puts = 0;
  get(key: string, type?: 'text'): Promise<string | null>;
  get<T = unknown>(key: string, type: 'json'): Promise<T | null>;
  async get(key: string, type?: 'text' | 'json'): Promise<unknown> {
    const v = this.store.get(key) ?? null;
    return type === 'json' && v != null ? JSON.parse(v) : v;
  }
  async put(key: string, value: string): Promise<void> {
    this.puts++;
    this.store.set(key, value);
  }
}

const hl = (o: Partial<HighlightEntry> = {}): HighlightEntry => ({
  kind: 'hl',
  page: 'notes:cap-theorem',
  color: 'yellow',
  exact: 'partition tolerance',
  prefix: 'you must choose ',
  suffix: ' is not optional',
  heading: 'tldr',
  pos: 10,
  note: '',
  detached: false,
  deleted: false,
  createdAt: 1000,
  updatedAt: 1000,
  ...o,
});
const pnote = (text: string, updatedAt: number, page = 'notes:cap-theorem'): PageNoteEntry => ({
  kind: 'page',
  page,
  text,
  updatedAt,
});

// --- Anchoring -----------------------------------------------------------------

describe('anchoring', () => {
  const text =
    'Intro: the cache sits in front of the database. ' +
    'Write-through: the cache sits in front of the database and every write goes to both. ' +
    'Write-back: the cache sits in front of the database but writes are flushed later.';
  const headings = [
    { id: 'intro', offset: 0 },
    { id: 'write-through', offset: text.indexOf('Write-through') },
    { id: 'write-back', offset: text.indexOf('Write-back') },
  ];

  it('collapses whitespace and maps back to raw offsets', () => {
    const { norm, map } = normalizeWithMap('a  b\n\n c');
    expect(norm).toBe('a b c');
    expect(map).toEqual([0, 1, 3, 4, 7]);
    expect(collapse(' x \t y ')).toBe(' x y ');
  });

  it('finds the nearest preceding heading', () => {
    expect(headingAt(headings, 3)).toBe('intro');
    expect(headingAt(headings, text.indexOf('Write-back') + 5)).toBe('write-back');
    expect(headingAt([], 5)).toBe('');
  });

  it('describes a span: trimmed, with ≤32 chars of context and a heading', () => {
    const start = text.indexOf('every write');
    const q = describeSpan(text, start - 1, start + 'every write'.length + 1, headings)!;
    expect(q.exact).toBe('every write');
    expect(q.start).toBe(start);
    expect(q.prefix.length).toBeLessThanOrEqual(CONTEXT_CHARS);
    expect(q.suffix.length).toBeLessThanOrEqual(CONTEXT_CHARS);
    expect(text.slice(0, start).endsWith(q.prefix)).toBe(true);
    expect(text.slice(start + q.exact.length).startsWith(q.suffix)).toBe(true);
    expect(q.heading).toBe('write-through');
    expect(q.pos).toBe(start);
  });

  it('refuses empty and over-long spans', () => {
    expect(describeSpan(text, 6, 7)).toBeNull(); // a single space
    const long = 'x'.repeat(MAX_EXACT_CHARS + 1);
    expect(describeSpan(long, 0, long.length)).toBeNull();
  });

  it('finds an exact match', () => {
    const start = text.indexOf('every write');
    const q = describeSpan(text, start, start + 11, headings)!;
    expect(findQuote(text, q, headings)).toEqual({ start, end: start + 11 });
  });

  it('tells duplicate occurrences apart by prefix / suffix', () => {
    const phrase = 'the cache sits in front of the database';
    const occurrences: number[] = [];
    for (let i = text.indexOf(phrase); i !== -1; i = text.indexOf(phrase, i + 1)) occurrences.push(i);
    expect(occurrences).toHaveLength(3);
    for (const at of occurrences) {
      const q = describeSpan(text, at, at + phrase.length, headings)!;
      // Wrong position hint and no heading: context alone must decide.
      const found = findQuote(text, { ...q, pos: 0, heading: '' }, headings);
      expect(found).toEqual({ start: at, end: at + phrase.length });
    }
  });

  it('uses the heading, then the position hint, when context is identical', () => {
    const t = 'alpha beta gamma. alpha beta gamma.';
    const hs = [
      { id: 'one', offset: 0 },
      { id: 'two', offset: 18 },
    ];
    const q = { exact: 'beta', prefix: '', suffix: '', heading: 'two', pos: 0 };
    expect(findQuote(t, q, hs)).toEqual({ start: 24, end: 28 });
    expect(findQuote(t, { ...q, heading: '', pos: 30 }, hs)).toEqual({ start: 24, end: 28 });
    expect(findQuote(t, { ...q, heading: '', pos: 0 }, hs)).toEqual({ start: 6, end: 10 });
  });

  it('still finds text after the page is edited around it', () => {
    const start = text.indexOf('flushed later');
    const q = describeSpan(text, start, start + 'flushed later'.length, headings)!;
    const edited =
      'New intro paragraph added on top.\n\n' +
      text.replace('but writes are', 'but (unlike write-through)   writes\nare').replace('Intro.', 'Introduction:');
    const found = findQuote(edited, q)!;
    expect(found).not.toBeNull();
    expect(edited.slice(found.start, found.end)).toBe('flushed later');
  });

  it('matches across changed whitespace and line wraps', () => {
    const q = { exact: 'every write goes', prefix: '', suffix: '', heading: '', pos: 0 };
    const t = 'and every\n   write\tgoes to both';
    const found = findQuote(t, q)!;
    expect(t.slice(found.start, found.end)).toBe('every\n   write\tgoes');
  });

  it('returns null (detached) when the text is gone', () => {
    const start = text.indexOf('every write');
    const q = describeSpan(text, start, start + 11, headings)!;
    expect(findQuote(text.replace('every write', 'each write'), q, headings)).toBeNull();
    expect(findQuote(text, { ...q, exact: '   ' })).toBeNull();
  });
});

// --- Keys, coercion, validation -----------------------------------------------

describe('keys + coercion', () => {
  it('validates keys', () => {
    expect(isValidHlKey('h:abc123def456')).toBe(true);
    expect(isValidHlKey('p:notes:cap-theorem')).toBe(true);
    expect(isValidHlKey('p:dsa:two-sum')).toBe(true);
    expect(isValidHlKey('h:short')).toBe(false);
    expect(isValidHlKey('h:ABCDEFGHIJ')).toBe(false);
    expect(isValidHlKey('p:blog:x')).toBe(false);
    expect(isValidHlKey('nc:notes:x')).toBe(false);
    expect(isValidHlKey(42)).toBe(false);
  });

  it('makes 12-char base36 ids', () => {
    let i = 0;
    const id = newHighlightId(() => (i++ % 36) / 36);
    expect(id).toMatch(/^[a-z0-9]{12}$/);
    expect(isValidHlKey(`h:${id}`)).toBe(true);
    expect(newHighlightId(() => 0.999999999)).toBe('999999999999');
  });

  it('checks that entries agree with their key', () => {
    expect(entryMatchesKey('h:abcdefgh1234', hl())).toBe(true);
    expect(entryMatchesKey('p:notes:cap-theorem', hl())).toBe(false);
    expect(entryMatchesKey('p:notes:cap-theorem', pnote('x', 1))).toBe(true);
    expect(entryMatchesKey('p:notes:other', pnote('x', 1))).toBe(false);
  });

  it('coerces junk leniently and never throws', () => {
    for (const junk of [null, 1, 'x', [], {}, { kind: 'hl' }, { kind: 'zz', page: 'notes:a' }, { kind: 'hl', page: 'notes:a', exact: '  ' }]) {
      expect(coerceHlEntry(junk)).toBeNull();
    }
    const e = coerceHlEntry({
      kind: 'hl',
      page: 'notes:a',
      color: 'purple',
      exact: 'x'.repeat(MAX_EXACT_CHARS + 50),
      prefix: 'p'.repeat(100),
      suffix: 7,
      pos: -5,
      note: 'n'.repeat(MAX_NOTE_CHARS + 1),
      detached: 'yes',
      createdAt: 12.7,
      updatedAt: '5',
    }) as HighlightEntry;
    expect(e.color).toBe('yellow');
    expect(e.exact).toHaveLength(MAX_EXACT_CHARS);
    expect(e.prefix).toHaveLength(CONTEXT_CHARS);
    expect(e.suffix).toBe('');
    expect(e.pos).toBe(0);
    expect(e.note).toHaveLength(MAX_NOTE_CHARS);
    expect(e.detached).toBe(false);
    expect(e.createdAt).toBe(12);
    expect(e.updatedAt).toBe(0);
    const p = coerceHlEntry({ kind: 'page', page: 'dsa:b', text: 't'.repeat(MAX_PAGE_NOTE_CHARS + 9), updatedAt: 3 }) as PageNoteEntry;
    expect(p.text).toHaveLength(MAX_PAGE_NOTE_CHARS);
  });

  it('strips text from tombstones', () => {
    const t = coerceHlEntry({ ...hl({ note: 'secret' }), deleted: true }) as HighlightEntry;
    expect(t).toMatchObject({ deleted: true, exact: '', note: '', prefix: '', suffix: '' });
  });
});

describe('strict body validation + caps', () => {
  const now = 1_700_000_000_000;
  it('accepts valid highlights, tombstones and page notes', () => {
    expect(parseHlEntry('h:abcdefgh1234', hl({ updatedAt: now }), now).ok).toBe(true);
    const t = parseHlEntry('h:abcdefgh1234', { ...hl({ updatedAt: now, note: 'x' }), deleted: true }, now);
    expect(t.ok && t.value.kind === 'hl' && t.value.note === '' && t.value.exact === '').toBe(true);
    expect(parseHlEntry('p:notes:cap-theorem', pnote('', now), now).ok).toBe(true);
  });

  it('rejects bad entries', () => {
    const bad: Array<[string, unknown]> = [
      ['h:abcdefgh1234', null],
      ['h:abcdefgh1234', hl({ updatedAt: 0 })],
      ['h:abcdefgh1234', hl({ updatedAt: now + MAX_CLOCK_SKEW_MS + 1 })],
      ['h:abcdefgh1234', { ...hl({ updatedAt: now }), color: 'red' }],
      ['h:abcdefgh1234', hl({ updatedAt: now, exact: ' ' })],
      ['h:abcdefgh1234', hl({ updatedAt: now, exact: 'x'.repeat(MAX_EXACT_CHARS + 1) })],
      ['h:abcdefgh1234', hl({ updatedAt: now, prefix: 'x'.repeat(CONTEXT_CHARS + 1) })],
      ['h:abcdefgh1234', hl({ updatedAt: now, note: 'x'.repeat(MAX_NOTE_CHARS + 1) })],
      ['h:abcdefgh1234', hl({ updatedAt: now, pos: -1 })],
      ['h:abcdefgh1234', { ...hl({ updatedAt: now }), page: 'blog:x' }],
      ['h:abcdefgh1234', pnote('x', now)],
      ['p:notes:cap-theorem', hl({ updatedAt: now })],
      ['p:notes:other', pnote('x', now)],
      ['p:notes:cap-theorem', pnote('x'.repeat(MAX_PAGE_NOTE_CHARS + 1), now)],
    ];
    for (const [k, b] of bad) expect(parseHlEntry(k, b, now).ok, k).toBe(false);
  });

  it('validates batches', () => {
    expect(parseBatchBody(null).ok).toBe(false);
    expect(parseBatchBody({ entries: {} }).ok).toBe(false);
    expect(parseBatchBody({ entries: { 'x:1': hl() } }).ok).toBe(false);
    const many: Record<string, unknown> = {};
    for (let i = 0; i <= MAX_BATCH_ENTRIES; i++) many[`h:${String(i).padStart(8, 'a')}`] = hl({ updatedAt: now });
    expect(parseBatchBody({ entries: many }, now).ok).toBe(false);
    const r = parseBatchBody({ entries: { 'h:abcdefgh1234': hl({ updatedAt: now }), 'p:notes:cap-theorem': pnote('hi', now) } }, now);
    expect(r.ok && Object.keys(r.value)).toEqual(['h:abcdefgh1234', 'p:notes:cap-theorem']);
    // Errors never echo the user's text.
    const e = parseBatchBody({ entries: { 'h:abcdefgh1234': hl({ updatedAt: now, note: 'my secret '.repeat(300) }) } }, now);
    expect(!e.ok && e.error).not.toContain('secret');
  });

  it('counts only live highlights against the cap', () => {
    const map: HlMap = {
      'h:aaaaaaaa1111': hl(),
      'h:aaaaaaaa2222': hl({ deleted: true, exact: '' }),
      'p:notes:cap-theorem': pnote('x', 1),
    };
    expect(countLive(map)).toBe(1);
    expect(liveHighlights(map).map((h) => h.id)).toEqual(['aaaaaaaa1111']);
  });
});

// --- Merge + tombstones ----------------------------------------------------------

describe('merge + tombstones', () => {
  it('tombstones win over older live copies and stay tombstoned', () => {
    const live = hl({ updatedAt: 100, note: 'n' });
    const dead = tombstone(live, 50); // clock stepped back: still newer
    expect(dead.updatedAt).toBe(101);
    expect(dead).toMatchObject({ deleted: true, exact: '', note: '' });
    const server = { 'h:aaaaaaaa1111': live };
    const { merged, push, pull } = mergeLww({ 'h:aaaaaaaa1111': dead }, server);
    expect(merged['h:aaaaaaaa1111']).toEqual(dead);
    expect(push).toEqual(['h:aaaaaaaa1111']);
    expect(pull).toEqual([]);
    // An older live copy arriving later is reported stale, not applied.
    const r = applyLwwBatch({ 'h:aaaaaaaa1111': dead }, { 'h:aaaaaaaa1111': live });
    expect(r.applied).toEqual([]);
    expect(r.stale['h:aaaaaaaa1111']).toEqual(dead);
  });

  it('page notes merge last-write-wins and an emptied note is a tombstone', () => {
    const { merged, pull } = mergeLww({ 'p:notes:a': pnote('old', 5, 'notes:a') }, { 'p:notes:a': pnote('', 9, 'notes:a') });
    expect(merged['p:notes:a']).toEqual(pnote('', 9, 'notes:a'));
    expect(pull).toEqual(['p:notes:a']);
  });

  it('nextStamp is strictly increasing', () => {
    expect(nextStamp(null, 10)).toBe(10);
    expect(nextStamp({ updatedAt: 50 }, 10)).toBe(51);
  });
});

// --- Grouping + export -------------------------------------------------------------

describe('grouping, search and export', () => {
  const pages: Record<string, PageMeta> = {
    'notes:cap-theorem': { title: 'CAP theorem', href: '/learn/notes/cap-theorem/', phase: '03-data' },
    'notes:caching': { title: 'Caching', href: '/learn/notes/caching/', phase: '01-foundations' },
    'dsa:two-sum': { title: 'Two Sum', href: '/learn/dsa/two-sum/', phase: '01-two-pointers' },
  };
  const phases: PhaseMeta[] = [
    { pillar: 'notes', slug: '01-foundations', num: '01', title: 'Foundations' },
    { pillar: 'notes', slug: '03-data', num: '03', title: 'Data' },
    { pillar: 'dsa', slug: '01-two-pointers', num: '01', title: 'Two pointers' },
  ];
  const map: HlMap = {
    'h:aaaaaaaa0001': hl({ pos: 50, color: 'blue', note: 'remember this' }),
    'h:aaaaaaaa0002': hl({ pos: 5, exact: 'consistency' }),
    'h:aaaaaaaa0003': hl({ page: 'notes:caching', exact: 'TTL', color: 'pink' }),
    'h:aaaaaaaa0004': hl({ page: 'dsa:two-sum', exact: 'two pointers', detached: true }),
    'h:aaaaaaaa0005': hl({ page: 'notes:gone-page', exact: 'old' }),
    'h:aaaaaaaa0006': hl({ deleted: true, exact: '' }),
    'p:notes:cap-theorem': pnote('My CAP summary\nline two', 1),
    'p:notes:caching': pnote('', 2),
  };

  it('groups by phase (site order) then page, highlights in reading order', () => {
    const g = groupHighlights(map, pages, phases);
    expect(g.map((x) => x.key)).toEqual(['notes/01-foundations', 'notes/03-data', 'dsa/01-two-pointers', 'other']);
    const cap = g[1]!.pages[0]!;
    expect(cap.title).toBe('CAP theorem');
    expect(cap.note).toBe('My CAP summary\nline two');
    expect(cap.highlights.map((h) => h.id)).toEqual(['aaaaaaaa0002', 'aaaaaaaa0001']);
    expect(g[3]!.pages[0]!.href).toBe('/learn/notes/gone-page/');
    expect(g[0]!.title).toBe('System design · 01 Foundations');
  });

  it('searches text, notes and titles; filters by colour (hiding page notes)', () => {
    const byNote = groupHighlights(map, pages, phases, { query: 'REMEMBER' });
    expect(byNote).toHaveLength(1);
    expect(byNote[0]!.pages[0]!.highlights.map((h) => h.id)).toEqual(['aaaaaaaa0001']);
    expect(byNote[0]!.pages[0]!.note).toBe('');
    const byTitle = groupHighlights(map, pages, phases, { query: 'two sum' });
    expect(byTitle[0]!.pages[0]!.highlights).toHaveLength(1);
    const pink = groupHighlights(map, pages, phases, { colors: new Set(['pink'] as const) });
    expect(pink.flatMap((g) => g.pages.map((p) => p.page))).toEqual(['notes:caching']);
    expect(pink[0]!.pages[0]!.note).toBe('');
    expect(groupHighlights(map, pages, phases, { query: 'zzz' })).toEqual([]);
  });

  it('exports Markdown with absolute links, notes and detached flags', () => {
    const md = toMarkdown(groupHighlights(map, pages, phases), 'https://example.test', '2026-10-22');
    expect(md).toContain('# My StackTrace highlights');
    expect(md).toContain('## System design · 03 Data');
    expect(md).toContain('### [CAP theorem](https://example.test/learn/notes/cap-theorem/)');
    expect(md).toContain('> My CAP summary\n> line two');
    expect(md).toContain('[open](https://example.test/learn/notes/cap-theorem/#hl-aaaaaaaa0001)');
    expect(md).toContain('  - Note: remember this');
    expect(md).toContain('_(yellow, detached)_');
    expect(md.endsWith('\n')).toBe(true);
    expect(toMarkdown([], 'https://x', 'd')).toContain('No highlights or notes yet.');
  });
});

// --- KV doc + API route ------------------------------------------------------------

describe('KV doc + API route', () => {
  const user = { id: 'u1', email: 'u@test.com', name: 'U', role: 'user' };
  type Ctx = Parameters<typeof PUT>[0];
  const ctx = (o: { user?: unknown; body?: string; kv?: KVNamespace | null; ctype?: string }) =>
    ({
      locals: { user: o.user ?? null, session: null, runtime: o.kv === null ? { env: {} } : { env: { KV: o.kv } } },
      params: {},
      request: new Request('http://x/api/v1/highlights', {
        method: o.body === undefined ? 'GET' : 'PUT',
        headers: { 'Content-Type': o.ctype ?? 'application/json' },
        body: o.body,
      }),
    }) as unknown as Ctx;
  const batch = (entries: Record<string, unknown>) => JSON.stringify({ entries });

  it('uses the hl:v1:<userId> key', () => {
    expect(highlightsDoc.key('u1')).toBe('hl:v1:u1');
  });

  it('401s anon, 400s bad bodies, 415s non-JSON, 503s without KV', async () => {
    const kv = new FakeKV();
    const t = Date.now();
    expect((await GET(ctx({ kv }))).status).toBe(401);
    expect((await PUT(ctx({ kv, body: batch({ 'h:abcdefgh1234': hl({ updatedAt: t }) }) }))).status).toBe(401);
    expect((await PUT(ctx({ user, kv, body: batch({ 'h:x': hl({ updatedAt: t }) }) }))).status).toBe(400);
    expect((await PUT(ctx({ user, kv, body: batch({ 'h:abcdefgh1234': { kind: 'hl' } }) }))).status).toBe(400);
    expect((await PUT(ctx({ user, kv, body: '{nope' }))).status).toBe(400);
    expect((await PUT(ctx({ user, kv, body: batch({}), ctype: 'text/plain' }))).status).toBe(415);
    expect((await GET(ctx({ user, kv: null }))).status).toBe(503);
    expect(kv.puts).toBe(0);
  });

  it('round-trips with last-write-wins, tombstones and a stale echo', async () => {
    const kv = new FakeKV();
    const t = Date.now() - 10_000;
    const a = hl({ updatedAt: t, note: 'n' });
    const note = pnote('page notes', t);
    const r1 = await PUT(ctx({ user, kv, body: batch({ 'h:abcdefgh1234': a, 'p:notes:cap-theorem': note }) }));
    expect(r1.status).toBe(200);
    expect(await r1.json()).toEqual({ applied: ['h:abcdefgh1234', 'p:notes:cap-theorem'], stale: {} });
    // Removed on another device (newer) + an older page-note edit.
    const dead = tombstone(a, t + 5);
    const r2 = await PUT(ctx({ user, kv, body: batch({ 'h:abcdefgh1234': dead, 'p:notes:cap-theorem': pnote('older', t - 1) }) }));
    expect(await r2.json()).toEqual({ applied: ['h:abcdefgh1234'], stale: { 'p:notes:cap-theorem': note } });
    const g = await GET(ctx({ user, kv }));
    expect(await g.json()).toEqual({ highlights: { 'h:abcdefgh1234': dead, 'p:notes:cap-theorem': note } });
    expect(kv.store.has('hl:v1:u1')).toBe(true);
    expect(await (await GET(ctx({ user: { ...user, id: 'u2' }, kv }))).json()).toEqual({ highlights: {} });
  });

  it('drops corrupt stored entries leniently on read', () => {
    const raw = JSON.stringify({
      v: 1,
      highlights: { 'h:abcdefgh1234': hl({ updatedAt: 5 }), 'h:bad': hl(), 'h:abcdefgh9999': { kind: 'hl' }, 'p:notes:a': pnote('x', 0, 'notes:a') },
    });
    expect(Object.keys(highlightsDoc.decode(raw))).toEqual(['h:abcdefgh1234']);
  });

  it('rejects a batch that would exceed the doc size cap', async () => {
    const kv = new FakeKV();
    const t = Date.now();
    // Each page note is ≤20,000 chars; 4-byte UTF-8 chars push the doc over 4 MiB.
    const big = '😀'.repeat(MAX_PAGE_NOTE_CHARS / 2);
    let status = 200;
    for (let i = 0; i < 40 && status === 200; i++) {
      const entries: Record<string, unknown> = {};
      for (let j = 0; j < 5; j++) entries[`p:notes:page-${i}-${j}`] = pnote(big, t, `notes:page-${i}-${j}`);
      status = (await PUT(ctx({ user, kv, body: batch(entries) }))).status;
    }
    expect(status).toBe(413);
  });
});
