import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import {
  byOrder,
  dsaTopic,
  neighbours,
  noteTopic,
  stripOneLiner,
  topicAnchor,
} from '../src/components/revise/revise-data';

const NOTE = [
  '## Definition (interview-ready)',
  '',
  'A **cache** keeps hot data close.',
  '',
  '**One-liner:** Keep hot data in `memory`.',
  '',
  '## Why it matters',
  '',
  'Speed.',
  '',
  '## TL;DR cheat sheet',
  '',
  '- Hit ratio matters.',
  '',
  '| a | b |',
  '|---|---|',
  '| 1 | 2 |',
].join('\n');

const DSA = [
  '## Problem',
  '',
  'Find it.',
  '',
  '## Interview-ready explanation',
  '',
  'Two pointers converge.',
  '',
  '**One-liner:** Move the shorter side.',
].join('\n');

describe('stripOneLiner', () => {
  it('removes only the one-liner paragraph', () => {
    const html = '<p>Keep.</p>\n<p><strong>One-liner:</strong> x <code>y</code></p>\n<p>Also keep.</p>';
    expect(stripOneLiner(html)).toBe('<p>Keep.</p>\n<p>Also keep.</p>');
  });
  it('is a no-op without a one-liner', () => {
    expect(stripOneLiner('<p>a</p>')).toBe('<p>a</p>');
  });
});

describe('noteTopic', () => {
  it('extracts one-liner, definition and TL;DR with the right anchors', () => {
    const t = noteTopic({ id: 'caching', body: NOTE, data: { title: 'Caching', order: 1 } });
    expect(t.href).toBe('/learn/notes/caching/');
    expect(t.fullHref).toBe('/learn/notes/caching/#tldr-cheat-sheet');
    expect(t.anchor).toBe(topicAnchor('caching'));
    expect(t.oneLinerHtml).toBe('Keep hot data in <code>memory</code>.');
    expect(t.definitionHtml).toContain('<strong>cache</strong>');
    expect(t.definitionHtml).not.toContain('One-liner');
    expect(t.cheatSheetHtml).toContain('<table>');
  });
  it('shows only the one-liner for premium notes', () => {
    const t = noteTopic({ id: 'p', body: NOTE, data: { title: 'P', order: 1, premium: true } });
    expect(t.oneLinerHtml).not.toBe('');
    expect(t.definitionHtml).toBe('');
    expect(t.cheatSheetHtml).toBe('');
  });
});

describe('dsaTopic', () => {
  it('uses the explanation anchor, complexity and escaped pitfalls', () => {
    const t = dsaTopic({
      id: 'water',
      body: DSA,
      data: {
        title: 'Water',
        order: 2,
        complexity: { time: 'O(n)', space: 'O(1)' },
        commonPitfalls: ['Off by one in `h[l] < h[r]`'],
      },
    });
    expect(t.fullHref).toBe('/learn/dsa/water/#interview-ready-explanation');
    expect(t.oneLinerHtml).toBe('Move the shorter side.');
    expect(t.definitionHtml).toBe('<p>Two pointers converge.</p>');
    expect(t.complexity).toEqual({ time: 'O(n)', space: 'O(1)' });
    expect(t.pitfallsHtml).toEqual(['Off by one in <code>h[l] &lt; h[r]</code>']);
  });
});

describe('ordering helpers', () => {
  it('sorts by order then id', () => {
    const xs = [
      { id: 'b', data: { order: 2 } },
      { id: 'c', data: { order: 1 } },
      { id: 'a', data: { order: 2 } },
    ];
    expect([...xs].sort(byOrder).map((x) => x.id)).toEqual(['c', 'a', 'b']);
  });
  it('finds neighbours', () => {
    const list = [{ slug: 'a' }, { slug: 'b' }, { slug: 'c' }];
    expect(neighbours(list, 'a')).toEqual({ prev: null, next: { slug: 'b' } });
    expect(neighbours(list, 'c')).toEqual({ prev: { slug: 'b' }, next: null });
    expect(neighbours(list, 'z')).toEqual({ prev: null, next: null });
  });
});

// Every real page must yield the pieces a revision sheet relies on.
function mdxFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => path.join(dir, f));
}
const entry = (file: string) => {
  const src = readFileSync(file, 'utf8');
  return {
    id: path.basename(file, '.mdx'),
    body: src.replace(/^---[\s\S]*?\n---\n/, ''),
    data: { title: 'x', order: 0 },
  };
};

describe('guides', () => {
  it('show the short version, open, with no one-liner', () => {
    const t = noteTopic({
      id: 'salary-negotiation',
      body: '## The short version\n\nThree rules.\n\n## Details\n\nx\n\n## TL;DR cheat sheet\n\n- y',
      data: { title: 'Salary', order: 1 },
    });
    expect(t.guide).toBe(true);
    expect(t.oneLinerHtml).toBe('');
    expect(t.definitionHtml).toContain('Three rules.');
  });
});

describe('real content', () => {
  it('every note has a one-liner, definition and cheat sheet', () => {
    for (const f of mdxFiles('src/content/notes')) {
      const t = noteTopic(entry(f));
      // Guides have "The short version" instead of a definition + one-liner.
      if (!t.guide) expect(t.oneLinerHtml, f).not.toBe('');
      expect(t.definitionHtml, f).not.toBe('');
      expect(t.cheatSheetHtml, f).not.toBe('');
      expect(t.fullHref, f).toMatch(/#tldr/);
    }
  }, 60_000);
  it('every DSA page has a one-liner and an explanation', () => {
    for (const f of mdxFiles('src/content/dsa')) {
      const t = dsaTopic(entry(f));
      if (!t.guide) expect(t.oneLinerHtml, f).not.toBe('');
      expect(t.definitionHtml, f).not.toBe('');
    }
  }, 60_000);
});
