import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import { compile } from '@mdx-js/mdx';
import type { Root } from 'mdast';
import {
  compareOutput,
  diffLines,
  findLldBlocks,
  mainClassName,
  normalizeOutput,
} from '../src/lib/lld-verify';
import remarkRunOnline, {
  RUN_ONLINE_CLASS,
  RUN_ONLINE_NOTE,
  RUN_ONLINE_TEXT,
} from '../src/lib/remark-run-online';
import { MAX_DIRECT_URL, runTarget, shortUrlFrom } from '../src/lib/run-online-client';
import { decodeGodboltUrl, assembleProgram, GODBOLT } from '../src/lib/code-tabs';

const fence = (info: string, body: string) => '```' + info + '\n' + body + '\n```';
const PROGRAM = 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] a) {\n        System.out.println("hi");\n    }\n}';

describe('findLldBlocks', () => {
  it('finds the java run block and the output block, with nondeterministic flag', () => {
    const src = [
      '---',
      'title: x',
      '---',
      '',
      fence('java', 'class Snippet {}'),
      '',
      fence('java run', PROGRAM),
      '',
      fence('text output nondeterministic', 'hi'),
    ].join('\n');
    const b = findLldBlocks(src);
    expect(b.errors).toEqual([]);
    expect(b.program?.code).toBe(PROGRAM);
    expect(b.program?.line).toBe(9); // frontmatter lines are kept for numbering
    expect(b.output).toMatchObject({ text: 'hi', nondeterministic: true });
  });

  it('finds blocks nested inside JSX (the QA toggles on mock notes)', () => {
    const src = `<QA q="Reference" level="hard">\n\n${fence('java run', PROGRAM)}\n\n${fence('text output', 'hi')}\n\n</QA>\n`;
    const b = findLldBlocks(src);
    expect(b.program?.code).toBe(PROGRAM);
    expect(b.output).toMatchObject({ text: 'hi', nondeterministic: false });
  });

  it('ignores java blocks without run and reports duplicates', () => {
    expect(findLldBlocks(fence('java', PROGRAM)).program).toBeUndefined();
    const dup = findLldBlocks([fence('java run', PROGRAM), fence('java run', PROGRAM)].join('\n\n'));
    expect(dup.errors).toHaveLength(1);
    const dupOut = findLldBlocks([fence('text output', 'a'), fence('console output', 'b')].join('\n\n'));
    expect(dupOut.errors).toHaveLength(1);
  });
});

describe('mainClassName', () => {
  it('uses the single public top-level class', () => {
    expect(mainClassName(PROGRAM)).toBe('Main');
    expect(mainClassName('class A {}\npublic final class Demo {\n  public static class Inner {}\n}')).toBe('Demo');
    expect(mainClassName('public record Point(int x) {}')).toBe('Point');
  });
  it('defaults to Main without a public class', () => {
    expect(mainClassName('class A { public static void main(String[] a) {} }')).toBe('Main');
  });
  it('rejects two public top-level classes', () => {
    expect(() => mainClassName('public class A {}\npublic class B {}')).toThrow(/A, B/);
  });
});

describe('normalizeOutput / compareOutput', () => {
  it('normalises line endings, trailing spaces and trailing blank lines', () => {
    expect(normalizeOutput('a  \r\nb\t\r\n\r\n\n')).toBe('a\nb');
    expect(normalizeOutput('  lead kept\n')).toBe('  lead kept');
  });
  it('accepts equal output and diffs a mismatch', () => {
    expect(compareOutput('a\nb\n', 'a  \r\nb')).toEqual({ ok: true, diff: '' });
    const c = compareOutput('a\nb\nc', 'a\nB\nc');
    expect(c.ok).toBe(false);
    expect(c.diff.split('\n')).toEqual(['  a', '+ B', '- b', '  c']);
  });
  it('diffLines handles added and missing lines', () => {
    expect(diffLines(['x'], ['x', 'y'])).toEqual(['  x', '+ y']);
    expect(diffLines(['x', 'y'], ['y'])).toEqual(['- x', '  y']);
  });
});

// The real notes: every note with a `java run` block must also have its
// demo output, unless listed here with a reason.
const LLD_DIR = path.resolve(__dirname, '../src/content/notes/14-lld');
const NO_OUTPUT_ALLOWLIST: Record<string, string> = {};
const lldNotes = readdirSync(LLD_DIR)
  .filter((f) => /^lld-.*\.mdx$/.test(f))
  .sort();

describe('LLD notes', () => {
  const parsed = lldNotes.map((f) => ({ f, b: findLldBlocks(readFileSync(path.join(LLD_DIR, f), 'utf8')) }));

  it('every lld note has exactly one well-formed java run program', () => {
    for (const { f, b } of parsed) {
      expect(b.errors, f).toEqual([]);
      expect(b.program, `${f} has no \`java run\` block`).toBeDefined();
      expect(b.program!.code, f).toMatch(/public\s+static\s+void\s+main\s*\(/);
      expect(() => mainClassName(b.program!.code), f).not.toThrow();
    }
  });

  it('every java run block has an output block, or an allowlisted reason', () => {
    for (const { f, b } of parsed) {
      if (!b.program) continue;
      if (f in NO_OUTPUT_ALLOWLIST) {
        expect(b.output, `${f} is allowlisted but has an output block; remove it from the list`).toBeUndefined();
        continue;
      }
      expect(b.output, `${f} has a \`java run\` block but no \`output\` block`).toBeDefined();
      expect(b.output!.text.trim(), f).not.toBe('');
    }
  });

  it('every program has a way to open in Compiler Explorer', () => {
    // LLD programs are too long for a /clientstate/ URL (godbolt answers 414),
    // so the button goes through godbolt's shortener; short ones open directly.
    for (const { f, b } of parsed.filter(({ b }) => b.program)) {
      const t = runTarget(assembleProgram(b.program!.code));
      if (t.kind === 'url') expect(t.url.length, f).toBeLessThanOrEqual(MAX_DIRECT_URL);
      else expect(JSON.parse(t.body).sessions[0].source, f).toContain('main');
    }
  });
});

// ---------------------------------------------------------------------------

const parser = unified().use(remarkParse).use(remarkMdx);
type J = {
  type: string;
  name?: string;
  lang?: string | null;
  meta?: string | null;
  value?: string;
  attributes?: { name: string; value: string }[];
  children?: J[];
};
const attrOf = (n: J, name: string) => n.attributes?.find((a) => a.name === name)?.value;

function transform(mdx: string): J {
  const tree = parser.parse(mdx) as Root;
  remarkRunOnline()(tree);
  return tree as unknown as J;
}

describe('remark-run-online', () => {
  it('inserts the link paragraph right after a java run block only', () => {
    const tree = transform(
      [fence('java', 'class A {}'), fence('java run', PROGRAM), 'Prose.', fence('python run', 'print(1)')].join('\n\n'),
    );
    const kids = tree.children!;
    expect(kids.map((k) => k.type)).toEqual(['code', 'code', 'mdxJsxFlowElement', 'paragraph', 'code']);
    const p = kids[2];
    expect(p.name).toBe('p');
    expect(attrOf(p, 'class')).toBe(RUN_ONLINE_CLASS);
    const a = p.children![0];
    expect(a).toMatchObject({ type: 'mdxJsxTextElement', name: 'button' });
    expect(attrOf(a, 'type')).toBe('button');
    expect(attrOf(a, 'data-run-online')).toBe('java');
    expect(a.children![0].value).toBe(RUN_ONLINE_TEXT);
    expect(p.children![1]).toEqual({ type: 'text', value: RUN_ONLINE_NOTE });
    // A non-java `run` fence gets no link; the marker word is still stripped.
    expect(kids[4].meta).toBeNull();
  });

  it('opens short programs directly and long ones via the shortener, public stripped', () => {
    const small = runTarget(PROGRAM);
    expect(small.kind).toBe('url');
    if (small.kind === 'url') {
      const state = decodeGodboltUrl(small.url);
      expect(state.sessions[0].language).toBe('java');
      expect(state.sessions[0].executors[0].compiler.id).toBe(GODBOLT.java.compiler);
      expect(state.sessions[0].source).toContain('\nclass Main {');
      expect(state.sessions[0].source).not.toMatch(/^public class/m);
    }
    const big = runTarget(PROGRAM + '\n// pad\n'.repeat(2000));
    expect(big.kind).toBe('shorten');
    if (big.kind === 'shorten') expect(JSON.parse(big.body).sessions[0].language).toBe('java');
    expect(shortUrlFrom({ url: 'https://godbolt.org/z/abc123' })).toBe('https://godbolt.org/z/abc123');
    expect(shortUrlFrom({ url: 'https://evil.example/z/abc' })).toBeNull();
    expect(shortUrlFrom(null)).toBeNull();
  });

  it('strips the marker meta (run, output, nondeterministic) and keeps the rest', () => {
    const tree = transform(
      [fence('java run title="x"', PROGRAM), fence('text output nondeterministic', 'hi'), fence('text', 'plain')].join('\n\n'),
    );
    const codes = tree.children!.filter((k) => k.type === 'code');
    expect(codes.map((c) => [c.lang, c.meta])).toEqual([
      ['java', 'title="x"'],
      ['text', null],
      ['text', null],
    ]);
  });

  it('inserts inside JSX parents too', () => {
    const tree = transform(`<QA q="x">\n\n${fence('java run', PROGRAM)}\n\n</QA>`);
    const qa = tree.children![0];
    expect(qa.children!.map((k) => k.name ?? k.type)).toEqual(['code', 'p']);
  });

  it('compiles through MDX to a real <p class> with the link', async () => {
    const out = String(
      await compile(fence('java run', PROGRAM), { remarkPlugins: [remarkRunOnline], jsx: true }),
    );
    expect(out).toMatch(new RegExp(`\\.p class="${RUN_ONLINE_CLASS}">`));
    expect(out).toContain('data-run-online');
    expect(out).not.toContain('clientstate');
    expect(out).toContain(RUN_ONLINE_TEXT);
    expect(out).toContain(RUN_ONLINE_NOTE.trim());
  });
});
