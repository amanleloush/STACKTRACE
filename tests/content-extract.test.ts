import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import {
  definitionSection,
  isGuide,
  findSection,
  hashId,
  inlineCodeHtml,
  mcqId,
  mcqs,
  oneLiner,
  oneLinerHtml,
  sections,
} from '../src/lib/content-extract';

function mdxFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => path.join(dir, f));
}
const body = (file: string) => readFileSync(file, 'utf8').replace(/^---[\s\S]*?\n---\n/, '');
const slugOf = (file: string) => path.basename(file, '.mdx');

const NOTES = mdxFiles('src/content/notes');
const DSA = mdxFiles('src/content/dsa');

describe('sections', () => {
  it('splits on h2 and slugs like rehype-slug, including duplicates', () => {
    const s = sections('intro\n\n## A b\n\ntext `x`\n\n### Sub\n\n## A b\n\n<Anim id="z" />\n\nmore');
    expect(s.map((x) => [x.heading, x.id])).toEqual([
      ['A b', 'a-b'],
      ['A b', 'a-b-1'],
    ]);
    expect(s[0]!.html).toContain('<code>x</code>');
    expect(s[0]!.html).toContain('<h3>Sub</h3>');
    expect(s[1]!.html).not.toContain('Anim');
    expect(s[1]!.text).toBe('more');
  });

  it('every page opens with a definition + one-liner, or (guides) a short version', () => {
    let guides = 0;
    for (const f of [...NOTES, ...DSA]) {
      const b = body(f);
      const all = sections(b);
      if (isGuide(all)) {
        guides++;
        expect(definitionSection(all), `${f}: guide must not also have a definition`).toBeUndefined();
        expect(oneLiner(b), `${f}: guide must not have a one-liner`).toBeUndefined();
        continue;
      }
      expect(definitionSection(all), f).toBeDefined();
      expect(oneLiner(b), f).toBeTruthy();
      expect(oneLinerHtml(b), f).not.toMatch(/^<p>/);
    }
    // Guides are the exception (strategy / how-to pages), not the rule.
    expect(guides).toBeGreaterThan(0);
    expect(guides).toBeLessThan(20);
  }, 120_000);

  it('finds the TL;DR on every note', () => {
    for (const f of NOTES) expect(findSection(sections(body(f)), /^TL;DR/), f).toBeDefined();
  }, 120_000);
});

describe('mcqs', () => {
  it('parses every MCQ on the site with a valid answer and unique id', () => {
    const ids = new Set<string>();
    let total = 0;
    for (const f of NOTES) {
      for (const m of mcqs(slugOf(f), body(f))) {
        total++;
        expect(m.answer, `${f}: ${m.q}`).toBeGreaterThanOrEqual(0);
        expect(m.answer, `${f}: ${m.q}`).toBeLessThan(m.options.length);
        expect(m.explanationHtml.length, `${f}: ${m.q}`).toBeGreaterThan(0);
        expect(ids.has(m.id), `duplicate id ${m.id}`).toBe(false);
        ids.add(m.id);
      }
    }
    expect(total).toBeGreaterThan(1000);
    for (const f of DSA) expect(mcqs(slugOf(f), body(f))).toEqual([]);
  }, 120_000);

  it('ids are stable and slug-scoped', () => {
    expect(mcqId('kafka', ' Why? ')).toBe(mcqId('kafka', 'Why?'));
    expect(mcqId('a', 'q')).not.toBe(mcqId('b', 'q'));
    expect(hashId('abc')).toBe(hashId('abc'));
  });
});

describe('inlineCodeHtml', () => {
  it('escapes and renders backtick spans', () => {
    expect(inlineCodeHtml('use `a<b` & "c"')).toBe('use <code>a&lt;b</code> &amp; &quot;c&quot;');
  });
});
