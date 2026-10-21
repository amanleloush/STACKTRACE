import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import {
  DURATION_MS,
  MAX_HISTORY,
  PHASES,
  RUBRICS,
  attemptFromRun,
  bestPerProblem,
  coerceHistory,
  coerceRun,
  elapsedMs,
  finish,
  formatClock,
  newRun,
  pause,
  phaseIndex,
  pickRandom,
  remainingMs,
  resume,
  scoreMax,
  scoreTotal,
  upsertAttempt,
  verdict,
  warnLevel,
  type Attempt,
} from '../src/components/mock/mock-logic';
import { briefSection, buildProblems, minutesIn, modeFor, stripMermaid, type NoteInput } from '../src/components/mock/mock-problems';
import { clampDuration, newRun, phasesFor } from '../src/components/mock/mock-logic';
import { sections } from '../src/lib/content-extract';

const MIN = 60_000;
const T0 = 1_700_000_000_000;

describe('time boxes', () => {
  it('add up to the round length', () => {
    for (const m of ['hld', 'lld'] as const) {
      expect(PHASES[m].reduce((s, p) => s + p.minutes, 0) * MIN).toBe(DURATION_MS[m]);
    }
    expect(DURATION_MS.hld).toBe(45 * MIN);
    expect(DURATION_MS.lld).toBe(90 * MIN);
  });

  it('picks the phase for the elapsed time', () => {
    expect(phaseIndex('hld', 0)).toBe(0);
    expect(phaseIndex('hld', 5 * MIN - 1)).toBe(0);
    expect(phaseIndex('hld', 5 * MIN)).toBe(1);
    expect(phaseIndex('hld', 21 * MIN)).toBe(4); // high-level design: 20–30
    expect(phaseIndex('hld', 44 * MIN)).toBe(6);
    expect(phaseIndex('hld', 99 * MIN)).toBe(6);
    expect(phaseIndex('lld', 19 * MIN)).toBe(1);
    expect(phaseIndex('lld', 20 * MIN)).toBe(2); // core code: 20–65
    expect(phaseIndex('lld', 64 * MIN)).toBe(2);
    expect(phaseIndex('lld', 65 * MIN)).toBe(3);
  });
});

describe('timer', () => {
  it('counts wall-clock time minus pauses', () => {
    let r = newRun('a1', 'hld-url-shortener', 'hld', T0);
    expect(elapsedMs(r, T0 + 3 * MIN)).toBe(3 * MIN);
    r = pause(r, T0 + 3 * MIN);
    // Frozen while paused, even across a "reload" (same state, later now).
    expect(elapsedMs(r, T0 + 50 * MIN)).toBe(3 * MIN);
    r = resume(r, T0 + 10 * MIN);
    expect(r.pausedTotal).toBe(7 * MIN);
    expect(elapsedMs(r, T0 + 12 * MIN)).toBe(5 * MIN);
    expect(remainingMs(r, T0 + 12 * MIN)).toBe(40 * MIN);
  });

  it('pause and resume are idempotent', () => {
    const r = newRun('a1', 'x', 'hld', T0);
    const p = pause(r, T0 + MIN);
    expect(pause(p, T0 + 2 * MIN)).toBe(p);
    expect(resume(r, T0 + 2 * MIN)).toBe(r);
  });

  it('clamps to [0, duration] and freezes on finish', () => {
    const r = newRun('a1', 'x', 'hld', T0);
    expect(elapsedMs(r, T0 - 5000)).toBe(0); // clock went backwards
    expect(remainingMs(r, T0 + 60 * MIN)).toBe(0);
    const f = finish(r, T0 + 30 * MIN);
    expect(elapsedMs(f, T0 + 99 * MIN)).toBe(30 * MIN);
    expect(finish(f, T0 + 40 * MIN)).toBe(f);
  });

  it('finishing while paused does not count the pause', () => {
    let r = newRun('a1', 'x', 'lld', T0);
    r = pause(r, T0 + 10 * MIN);
    r = finish(r, T0 + 30 * MIN);
    expect(r.pausedAt).toBeNull();
    expect(elapsedMs(r, T0 + 31 * MIN)).toBe(10 * MIN);
    // A stored state with both set (older tab) is handled the same way.
    const odd = { ...newRun('a1', 'x', 'lld', T0), pausedAt: T0 + 10 * MIN, finishedAt: T0 + 30 * MIN };
    expect(elapsedMs(odd, T0 + 31 * MIN)).toBe(10 * MIN);
  });

  it('warns at 10 and 5 minutes left', () => {
    expect(warnLevel(10 * MIN + 1)).toBe('none');
    expect(warnLevel(10 * MIN)).toBe('ten');
    expect(warnLevel(5 * MIN + 1)).toBe('ten');
    expect(warnLevel(5 * MIN)).toBe('five');
    expect(warnLevel(0)).toBe('up');
  });

  it('formats the clock', () => {
    expect(formatClock(45 * MIN)).toBe('45:00');
    expect(formatClock(90 * MIN)).toBe('1:30:00');
    expect(formatClock(61_500)).toBe('01:02');
    expect(formatClock(1)).toBe('00:01');
    expect(formatClock(-5)).toBe('00:00');
  });
});

describe('scoring', () => {
  it('totals 0/1/2 items and ignores junk', () => {
    expect(scoreTotal([2, 1, 0, 2])).toBe(5);
    expect(scoreTotal([3, -1, Number.NaN, 2])).toBe(2);
    expect(scoreMax('hld')).toBe(RUBRICS.hld.length * 2);
    expect(RUBRICS.hld).toHaveLength(10);
    expect(RUBRICS.lld).toHaveLength(10);
  });

  it('maps totals to verdict bands', () => {
    expect(verdict(20, 20).band).toBe('strong');
    expect(verdict(15, 20).band).toBe('strong');
    expect(verdict(14, 20).band).toBe('borderline');
    expect(verdict(10, 20).band).toBe('borderline');
    expect(verdict(9, 20).band).toBe('practice');
    expect(verdict(0, 0).band).toBe('practice');
  });
});

describe('coerceRun', () => {
  it('round-trips a valid run', () => {
    const r = pause(newRun('abc123', 'lld-parking-lot', 'lld', T0), T0 + MIN);
    expect(coerceRun(JSON.parse(JSON.stringify(r)))).toEqual(r);
  });

  it('rejects junk and repairs scores and duration', () => {
    expect(coerceRun(null)).toBeNull();
    expect(coerceRun('x')).toBeNull();
    expect(coerceRun({ ...newRun('abc', 'x', 'hld', T0), mode: 'sde' })).toBeNull();
    expect(coerceRun({ ...newRun('abc', 'Bad Slug', 'hld', T0) })).toBeNull();
    expect(coerceRun({ ...newRun('ABC!', 'x', 'hld', T0) })).toBeNull();
    expect(coerceRun({ ...newRun('abc', 'x', 'hld', T0), pausedAt: 'soon' })).toBeNull();
    expect(coerceRun({ ...newRun('abc', 'x', 'hld', T0), finishedAt: T0 - 1 })).toBeNull();
    const fixed = coerceRun({ ...newRun('abc', 'x', 'hld', T0), durationMs: 1e12, scores: [2, 5, 'x'] });
    expect(fixed?.durationMs).toBe(DURATION_MS.hld);
    expect(fixed?.scores).toEqual([2, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });
});

describe('history', () => {
  const att = (id: string, at: number, extra: Partial<Attempt> = {}): Attempt => ({
    id, at, slug: 'hld-chat-system', title: 'Chat', mode: 'hld', usedMs: 40 * MIN, score: 10, max: 20, ...extra,
  });

  it('keeps valid attempts, newest first, de-duplicated and capped', () => {
    const raw = [
      att('a', 1), att('b', 3), att('a', 2), { junk: true }, att('c', 2, { score: 21 }),
      att('d', 4, { mode: 'nope' as never }), att('e', 5, { title: '' }),
    ];
    const h = coerceHistory(raw);
    expect(h.map((a) => a.id)).toEqual(['e', 'b', 'a']);
    expect(h[0]!.title).toBe('hld-chat-system');
    expect(coerceHistory('nope')).toEqual([]);

    const many = Array.from({ length: 80 }, (_, i) => att(`x${i}`, i));
    const capped = coerceHistory(many);
    expect(capped).toHaveLength(MAX_HISTORY);
    expect(capped[0]!.id).toBe('x79');
  });

  it('upserts by id and keeps the cap', () => {
    let h: Attempt[] = Array.from({ length: MAX_HISTORY }, (_, i) => att(`x${i}`, i));
    h = upsertAttempt(h, att('x10', 10, { score: 18 }));
    expect(h).toHaveLength(MAX_HISTORY);
    expect(h.find((a) => a.id === 'x10')!.score).toBe(18);
    h = upsertAttempt(h, att('new', 1000));
    expect(h).toHaveLength(MAX_HISTORY);
    expect(h[0]!.id).toBe('new');
    expect(h.some((a) => a.id === 'x0')).toBe(false); // oldest dropped
  });

  it('builds an attempt from a finished run', () => {
    let r = newRun('abc', 'hld-chat-system', 'hld', T0);
    r = { ...finish(r, T0 + 30 * MIN), scores: [2, 2, 1, 0, 0, 0, 0, 0, 0, 0] };
    expect(attemptFromRun(r, 'Chat', T0 + 99 * MIN)).toEqual({
      id: 'abc', at: T0, slug: 'hld-chat-system', title: 'Chat', mode: 'hld', usedMs: 30 * MIN, score: 5, max: 20,
    });
  });

  it('finds the best attempt per problem', () => {
    const best = bestPerProblem([
      att('a', 1, { score: 12 }),
      att('b', 2, { score: 14, usedMs: 44 * MIN }),
      att('c', 3, { score: 14, usedMs: 41 * MIN }),
      att('d', 4, { slug: 'lld-parking-lot', title: 'Parking', mode: 'lld', score: 19 }),
    ]);
    expect(best.map((b) => [b.slug, b.best.id, b.attempts])).toEqual([
      ['lld-parking-lot', 'd', 1],
      ['hld-chat-system', 'c', 3],
    ]);
  });

  it('picks a random item', () => {
    expect(pickRandom([], () => 0.5)).toBeUndefined();
    expect(pickRandom(['a', 'b', 'c'], () => 0)).toBe('a');
    expect(pickRandom(['a', 'b', 'c'], () => 0.99999)).toBe('c');
  });
});

describe('stripMermaid', () => {
  it('drops mermaid blocks and keeps other code', () => {
    const html = '<p>a</p>\n<pre><code class="language-mermaid">flowchart LR\nA --> B\n</code></pre>\n<pre><code class="language-java">x</code></pre>';
    expect(stripMermaid(html)).toBe('<p>a</p>\n<pre><code class="language-java">x</code></pre>');
  });
});

describe('mock problems from content', () => {
  const dir = 'src/content/notes';
  const files = readdirSync(dir, { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.mdx'));
  const notes: NoteInput[] = files.map((f) => {
    const raw = readFileSync(path.join(dir, f), 'utf8');
    const fm = raw.match(/^---\n([\s\S]*?)\n---\n/)![1]!;
    const get = (k: string) =>
      fm.match(new RegExp(`^${k}:\\s*(.+)$`, 'm'))?.[1]?.trim().replace(/^"(.*)"$/, '$1');
    return {
      slug: path.basename(f, '.mdx'),
      title: get('title') ?? '',
      phase: get('phase') ?? '',
      order: Number(get('order') ?? 0),
      premium: get('premium') === 'true',
      body: raw.replace(/^---[\s\S]*?\n---\n/, ''),
    };
  });

  it('classifies modes', () => {
    expect(modeFor({ phase: '07-hld-problems', slug: 'hld-url-shortener' })).toBe('hld');
    expect(modeFor({ phase: '07-hld-problems', slug: 'hld-framework' })).toBeNull();
    expect(modeFor({ phase: '07-hld-problems', slug: 'hld-failure-scenarios' })).toBeNull();
    expect(modeFor({ phase: '14-lld', slug: 'lld-mock-snake-ladder' })).toBe('lld');
    expect(modeFor({ phase: '14-lld', slug: 'solid-principles' })).toBeNull();
    expect(modeFor({ phase: '05-caching', slug: 'lld-x' })).toBeNull();
  });

  it('never uses the definition as the brief', () => {
    const s = sections('## Definition (interview-ready)\n\nanswer\n\n## Why it matters\n\nctx');
    expect(briefSection(s)?.heading).toBe('Why it matters');
    const m = sections('## Definition (interview-ready)\n\na\n\n## How to use this mock\n\nb\n\n## The problem\n\nc');
    expect(briefSection(m)?.heading).toBe('The problem');
  });

  it('builds every HLD and lld-* note with a brief, an answer and a TL;DR', () => {
    const problems = buildProblems(notes);
    const hld = problems.filter((p) => p.mode === 'hld');
    const lld = problems.filter((p) => p.mode === 'lld');
    expect(hld.length).toBe(notes.filter((n) => n.phase === '07-hld-problems' && !['hld-framework', 'hld-failure-scenarios'].includes(n.slug)).length);
    expect(lld.map((p) => p.slug)).toEqual(expect.arrayContaining(['lld-mock-cart-coupons', 'lld-mock-snake-ladder']));
    expect(lld.every((p) => p.slug.startsWith('lld-'))).toBe(true);
    for (const p of problems) {
      expect(p.briefHtml, p.slug).not.toBe('');
      expect(p.briefHeading, p.slug).not.toMatch(/Definition/);
      expect(p.briefHtml, p.slug).not.toContain('language-mermaid');
      expect(p.definitionHtml, p.slug).toContain('One-liner');
      expect(p.tldrHtml, p.slug).not.toBe('');
    }
  });
});

describe('per-problem durations', () => {
  it('reads a stated length from the title', () => {
    expect(minutesIn('Mock (60 min): Snake and Ladder')).toBe(60);
    expect(minutesIn('HLD: URL Shortener')).toBeUndefined();
  });

  it('clamps to [15 min, mode default]', () => {
    expect(clampDuration('lld', 60 * MIN)).toBe(60 * MIN);
    expect(clampDuration('lld', 500 * MIN)).toBe(90 * MIN);
    expect(clampDuration('hld', 5 * MIN)).toBe(45 * MIN);
    expect(clampDuration('hld', 'x')).toBe(45 * MIN);
    expect(newRun('a', 's', 'lld', 0, 60 * MIN).durationMs).toBe(60 * MIN);
    expect(newRun('a', 's', 'lld', 0).durationMs).toBe(90 * MIN);
  });

  it('scales the phase guide and keeps the total', () => {
    const p = phasesFor('lld', 60 * MIN);
    expect(p.reduce((s, x) => s + x.minutes, 0)).toBe(60);
    expect(p.every((x) => x.minutes >= 1)).toBe(true);
    expect(phasesFor('hld')).toEqual(phasesFor('hld', 45 * MIN));
  });
});
