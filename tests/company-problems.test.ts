import { describe, it, expect } from 'vitest';
import {
  buildProblemIndex,
  companySlug,
  normalizeAcceptance,
  parseCompanyCsv,
  parseCsv,
  selectTopProblems,
  slugFromLink,
  summarize,
  type CompanyFile,
  type RecentSets,
} from '~/lib/company-problems';

const HEADER = 'Difficulty,Title,Frequency,Acceptance Rate,Link,Topics';
const noRecent: RecentSets = { d30: new Set(), m3: new Set(), m6: new Set() };

describe('parseCsv', () => {
  it('handles quoted commas, escaped quotes, CRLF, BOM and blank lines', () => {
    const text = '﻿a,b,c\r\n"x, y","say ""hi""",3\r\n\r\n"multi\nline",,last\n';
    expect(parseCsv(text)).toEqual([
      ['a', 'b', 'c'],
      ['x, y', 'say "hi"', '3'],
      ['multi\nline', '', 'last'],
    ]);
  });

  it('keeps a final row without trailing newline', () => {
    expect(parseCsv('a,b\n1,2')).toEqual([['a', 'b'], ['1', '2']]);
  });
});

describe('row normalization', () => {
  it('extracts slugs from LeetCode links and rejects junk', () => {
    expect(slugFromLink('https://leetcode.com/problems/two-sum')).toBe('two-sum');
    expect(slugFromLink('https://leetcode.com/problems/Two-Sum/description/')).toBe('two-sum');
    expect(slugFromLink('https://example.com/two-sum')).toBeNull();
    expect(slugFromLink('https://leetcode.com/problems/bad_slug!')).toBeNull();
  });

  it('normalizes acceptance from the source scale (pct / 10 000) and others', () => {
    expect(normalizeAcceptance(0.005800918768980581)).toBe(58);
    expect(normalizeAcceptance(0.43)).toBe(43);
    expect(normalizeAcceptance(61.24)).toBe(61.2);
    expect(normalizeAcceptance(Number.NaN)).toBe(0);
  });

  it('parses a company CSV: quoted titles, topics list, difficulty case, dedupe', () => {
    const csv = [
      HEADER,
      'EASY,Two Sum,100.0,0.0058,https://leetcode.com/problems/two-sum,"Array, Hash Table"',
      'MEDIUM,"Pow(x, n)",41.7,0.0039,https://leetcode.com/problems/powx-n,"Math, Recursion"',
      'HARD,Dup,10,0.004,https://leetcode.com/problems/two-sum,Array',
      'WEIRD,Skip Me,5,0.004,https://leetcode.com/problems/skip-me,',
    ].join('\n');
    const rows = parseCompanyCsv(csv);
    expect(rows.map((r) => r.slug)).toEqual(['two-sum', 'powx-n']);
    expect(rows[1]).toMatchObject({
      title: 'Pow(x, n)',
      difficulty: 'Medium',
      frequency: 41.7,
      acceptance: 39,
      topics: ['Math', 'Recursion'],
    });
  });

  it('locates columns by header name', () => {
    const csv = 'Link,Title,Difficulty,Frequency\nhttps://leetcode.com/problems/a-b,A B,easy,3';
    expect(parseCompanyCsv(csv)[0]).toMatchObject({ slug: 'a-b', title: 'A B', difficulty: 'Easy', topics: [] });
  });

  it('throws when a required column is missing', () => {
    expect(() => parseCompanyCsv('Title,Link\nx,y')).toThrow(/missing required columns/);
  });
});

describe('selection', () => {
  const csv = [
    HEADER,
    'EASY,A,50,0.005,https://leetcode.com/problems/a,',
    'EASY,B,90,0.005,https://leetcode.com/problems/b,',
    'HARD,C,50,0.005,https://leetcode.com/problems/c,',
    'MEDIUM,D,70,0.005,https://leetcode.com/problems/d,',
  ].join('\n');

  it('keeps top-N by frequency, ties in source order, with recent windows', () => {
    const sets: RecentSets = { d30: new Set(['d']), m3: new Set(['d', 'a']), m6: new Set(['c']) };
    const top = selectTopProblems(parseCompanyCsv(csv), sets, 3);
    expect(top.map((p) => p.slug)).toEqual(['b', 'd', 'a']);
    expect(top.map((p) => p.recent)).toEqual([null, '30d', '3m']);
    expect(top[0]!.link).toBe('https://leetcode.com/problems/b/');
  });

  it('summarizes difficulty split and recent count', () => {
    const sets: RecentSets = { ...noRecent, m6: new Set(['c']) };
    const file: CompanyFile = {
      name: 'Acme',
      slug: 'acme',
      sourceCount: 4,
      problems: selectTopProblems(parseCompanyCsv(csv), sets, 100),
    };
    expect(summarize(file)).toEqual({
      name: 'Acme', slug: 'acme', problemCount: 4, sourceCount: 4,
      easy: 2, medium: 1, hard: 1, recent: 1,
    });
  });

  it('builds a cross-company index keyed by slug', () => {
    const rows = parseCompanyCsv(csv);
    const f1: CompanyFile = { name: 'One', slug: 'one', sourceCount: 4, problems: selectTopProblems(rows, noRecent, 2) };
    const f2: CompanyFile = { name: 'Two', slug: 'two', sourceCount: 4, problems: selectTopProblems(rows, noRecent, 4) };
    const idx = buildProblemIndex([f1, f2]);
    expect(Object.keys(idx)).toEqual(['a', 'b', 'c', 'd']);
    expect(idx.b!.companies).toEqual(['one', 'two']);
    expect(idx.a!.companies).toEqual(['two']);
  });

  it('slugifies company names', () => {
    expect(companySlug('Goldman Sachs')).toBe('goldman-sachs');
    expect(companySlug('AT&T')).toBe('at-and-t');
    expect(companySlug('X')).toBe('x');
  });
});
