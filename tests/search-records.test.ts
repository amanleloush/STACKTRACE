import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { buildPageRecords, slugFor, splitFrontmatter } from '../scripts/search-records';

const NOTE = `---
title: "Kafka <Consumer> Groups"
phase: "04-messaging-kafka"
order: 3
summary: "How partitions are shared"
---

## Definition (interview-ready)

A consumer group shares partitions.

**One-liner:** A **consumer group** splits a topic's partitions across \`consumers\`.

## Rebalancing

<Anim id="x" />

When a member joins, partitions move.

## Empty

<Quiz />
`;

describe('splitFrontmatter', () => {
  it('parses yaml and returns the body', () => {
    const { data, body } = splitFrontmatter(NOTE);
    expect(data).toEqual({
      title: 'Kafka <Consumer> Groups',
      summary: 'How partitions are shared',
      draft: false,
      premium: false,
    });
    expect(body.startsWith('\n## Definition')).toBe(true);
  });

  it('handles CRLF and rejects files without a title', () => {
    expect(splitFrontmatter('---\r\ntitle: X\r\n---\r\nbody').body).toBe('body');
    expect(() => splitFrontmatter('no frontmatter')).toThrow();
    expect(() => splitFrontmatter('---\nphase: x\n---\n')).toThrow();
  });
});

describe('slugFor', () => {
  it('flattens to the basename, like content.config.ts', () => {
    expect(slugFor('04-messaging-kafka/kafka-consumer-groups.mdx')).toBe('kafka-consumer-groups');
  });
});

describe('buildPageRecords', () => {
  it('makes a page record and one record per non-empty section', () => {
    const recs = buildPageRecords({ kind: 'Note', file: '04-x/kafka-groups.mdx', raw: NOTE })!;
    expect(recs.page.url).toBe('/learn/notes/kafka-groups/');
    expect(recs.page.html).toContain('<h1>Kafka &lt;Consumer&gt; Groups</h1>');
    expect(recs.page.html).toContain('<p>How partitions are shared</p>');
    expect(recs.page.html).toContain("splits a topic's partitions across consumers.");
    expect(recs.page.html).toContain('data-pagefind-meta="kind:Note"');

    expect(recs.sections.map((s) => s.url)).toEqual([
      '/learn/notes/kafka-groups/#definition-interview-ready',
      '/learn/notes/kafka-groups/#rebalancing',
    ]);
    const reb = recs.sections[1]!;
    expect(reb.content).toBe('Rebalancing. When a member joins, partitions move.');
    expect(reb.meta).toEqual({
      title: 'Kafka <Consumer> Groups › Rebalancing',
      page: 'Kafka <Consumer> Groups',
      section: 'Rebalancing',
      kind: 'Note',
    });
    expect(reb.filters).toEqual({ type: ['Note'] });
  });

  it('uses /learn/dsa/ for DSA pages', () => {
    const recs = buildPageRecords({ kind: 'DSA', file: '05-x/binary-search.mdx', raw: NOTE })!;
    expect(recs.page.url).toBe('/learn/dsa/binary-search/');
    expect(recs.sections[0]!.url.startsWith('/learn/dsa/binary-search/#')).toBe(true);
    expect(recs.sections[0]!.meta.kind).toBe('DSA');
  });

  it('skips drafts and keeps premium bodies out of the index', () => {
    const draft = NOTE.replace('order: 3', 'order: 3\ndraft: true');
    expect(buildPageRecords({ kind: 'Note', file: 'a.mdx', raw: draft })).toBeNull();
    const premium = NOTE.replace('order: 3', 'order: 3\npremium: true');
    const recs = buildPageRecords({ kind: 'Note', file: 'a.mdx', raw: premium })!;
    expect(recs.sections).toEqual([]);
    expect(recs.page.html).toContain('<h1>');
  });

  it('builds records for every real note and DSA page', () => {
    for (const [kind, dir] of [
      ['Note', 'src/content/notes'],
      ['DSA', 'src/content/dsa'],
    ] as const) {
      const files = readdirSync(dir, { recursive: true, encoding: 'utf8' }).filter((f) =>
        f.endsWith('.mdx'),
      );
      for (const file of files) {
        const recs = buildPageRecords({ kind, file, raw: readFileSync(path.join(dir, file), 'utf8') });
        expect(recs, file).not.toBeNull();
        expect(recs!.sections.length, file).toBeGreaterThan(0);
      }
    }
  }, 120_000);
});
