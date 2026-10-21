import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import type { Root } from 'mdast';
import {
  assembleProgram,
  base64UrlAscii,
  decodeGodboltUrl,
  godboltSource,
  godboltUrl,
  GODBOLT,
  normalizeLang,
  parseTabsProp,
} from '../src/lib/code-tabs';
import remarkCodeTabs, { collectParts, CodeTabsError } from '../src/lib/remark-code-tabs';

const parser = unified().use(remarkParse).use(remarkMdx);
const fence = (info: string, body: string) => '```' + info + '\n' + body + '\n```';

/** Parse MDX and run the plugin; returns the tree. */
function transform(mdx: string, filePath?: string): Root {
  const tree = parser.parse(mdx) as Root;
  remarkCodeTabs()(tree, { path: filePath });
  return tree;
}

type J = { type: string; name?: string; attributes?: { name: string; value: string }[]; children?: J[] };
const findAll = (n: J, name: string, out: J[] = []): J[] => {
  if (n.type === 'mdxJsxFlowElement' && n.name === name) out.push(n);
  for (const c of n.children ?? []) findAll(c, name, out);
  return out;
};
const attrOf = (n: J, name: string) => n.attributes?.find((a) => a.name === name)?.value;

describe('assembleProgram (driver splitting)', () => {
  it('splices the solution in place of a // @solution marker', () => {
    const p = assembleProgram('int f() { return 1; }\n', '#include <cstdio>\n\n// @solution\n\nint main() { printf("%d", f()); }');
    expect(p).toBe('#include <cstdio>\n\nint f() { return 1; }\n\nint main() { printf("%d", f()); }\n');
  });

  it('accepts # @solution for Python, with indentation and trailing spaces', () => {
    expect(assembleProgram('def f(): return 1', '  # @solution  \nprint(f())')).toBe('def f(): return 1\nprint(f())\n');
  });

  it('puts the solution first when the driver has no marker', () => {
    expect(assembleProgram('def f(): return 1\n\n', 'print(f())\n')).toBe('def f(): return 1\n\nprint(f())\n');
  });

  it('is just the solution without a driver', () => {
    expect(assembleProgram('x = 1\n', undefined)).toBe('x = 1\n');
    expect(assembleProgram('x = 1', '   \n')).toBe('x = 1\n');
  });

  it('keeps $-sequences in code literal', () => {
    expect(assembleProgram('s = "$&$1"', '# @solution')).toBe('s = "$&$1"\n');
  });

  it('does not treat a marker mid-line as a marker', () => {
    expect(assembleProgram('A', 'x = 1  # @solution\nB')).toBe('A\n\nx = 1  # @solution\nB\n');
  });
});

describe('godbolt link', () => {
  const prog = 'int main() { return 0; }\n';

  it('is deterministic and round-trips to a ClientState with an executor', () => {
    const url = godboltUrl('cpp', prog);
    expect(godboltUrl('cpp', prog)).toBe(url);
    expect(url.startsWith('https://godbolt.org/clientstate/')).toBe(true);
    expect(url).toMatch(/^https:\/\/godbolt\.org\/clientstate\/[A-Za-z0-9_-]+$/);
    const state = decodeGodboltUrl(url);
    expect(state.sessions).toHaveLength(1);
    const s = state.sessions[0]!;
    expect(s.language).toBe('c++');
    expect(s.source).toBe(prog);
    expect(s.compilers).toEqual([]);
    expect(s.executors[0]!.compiler).toEqual({ id: GODBOLT.cpp.compiler, libs: [], options: '-std=c++20 -O2' });
  });

  it('pins the exact encoding (so links stay stable across builds)', () => {
    expect(godboltUrl('python', 'print(1)\n')).toBe(
      'https://godbolt.org/clientstate/' +
        base64UrlAscii(
          '{"sessions":[{"id":1,"language":"python","source":"print(1)\\n","compilers":[],' +
            '"executors":[{"compiler":{"id":"python313","libs":[],"options":""},' +
            '"compilerOutputVisible":true,"compilerVisible":false,"arguments":"","argumentsVisible":false,' +
            '"stdin":"","stdinVisible":false,"wrap":false}]}]}',
        ),
    );
  });

  it('escapes non-ASCII as \\u so base64 stays ASCII, and decodes back', () => {
    const src = 'print("café → ok")\n';
    const url = godboltUrl('python', src);
    const b64 = url.split('/clientstate/')[1]!.replace(/-/g, '+').replace(/_/g, '/');
    expect(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))).toContain('caf\\u00e9 \\u2192 ok');
    expect(decodeGodboltUrl(url).sessions[0]!.source).toBe(src);
  });

  it('drops `public` from top-level Java classes for godbolt (it compiles example.java)', () => {
    const src = 'import java.util.*;\nclass Solution {\n  public int f() { return 1; }\n}\npublic class Main {\n  public static void main(String[] a) {}\n}\npublic final class X {}\n';
    const out = godboltSource('java', src);
    expect(out).toContain('\nclass Main {');
    expect(out).toContain('\nfinal class X {}');
    expect(out).toContain('  public int f()');
    expect(out).toContain('  public static void main');
    expect(godboltSource('cpp', 'public class Main')).toBe('public class Main');
    expect(decodeGodboltUrl(godboltUrl('java', src)).sessions[0]!.source).toBe(out);
  });
});

describe('normalizeLang / parseTabsProp', () => {
  it('maps fence aliases', () => {
    expect(normalizeLang('C++')).toBe('cpp');
    expect(normalizeLang('py')).toBe('python');
    expect(normalizeLang('java')).toBe('java');
    expect(normalizeLang('go')).toBeNull();
    expect(normalizeLang(null)).toBeNull();
  });

  it('coerces the tabs prop and rejects foreign run links', () => {
    const raw = JSON.stringify([
      { lang: 'cpp', runUrl: 'https://godbolt.org/clientstate/abc', hasDriver: true, label: 'x' },
      { lang: 'cpp', runUrl: 'https://godbolt.org/clientstate/dup' },
      { lang: 'java', runUrl: 'javascript:alert(1)' },
      { lang: 'rust' },
      null,
    ]);
    expect(parseTabsProp(raw)).toEqual([
      { lang: 'cpp', label: 'C++', runUrl: 'https://godbolt.org/clientstate/abc', hasDriver: true },
      { lang: 'java', label: 'Java', runUrl: '', hasDriver: false },
    ]);
    expect(parseTabsProp('not json')).toEqual([]);
    expect(parseTabsProp(undefined)).toEqual([]);
  });
});

describe('remark-code-tabs', () => {
  const mdx = [
    'Intro',
    '',
    '<CodeTabs>',
    '',
    fence('python', 'def f():\n    return 1'),
    '',
    fence('python driver', '# @solution\nprint(f())'),
    '',
    fence('cpp', 'int f() { return 1; }'),
    '',
    fence('cpp driver', '#include <iostream>\n// @solution\nint main() { std::cout << f() << "\\n"; }'),
    '',
    fence('java', 'class Solution {}'),
    '',
    '</CodeTabs>',
    '',
    fence('python', 'untouched = True'),
  ].join('\n');

  it('rewrites children into named slots in C++, Java, Python order', () => {
    const tree = transform(mdx) as unknown as J;
    const [ct] = findAll(tree, 'CodeTabs');
    expect(ct).toBeDefined();
    const slots = (ct!.children ?? []).map((c) => attrOf(c, 'slot'));
    expect(slots).toEqual(['cpp', 'cpp-full', 'java', 'python', 'python-full']);
    // Slots hold real `code` nodes, so the MDX pipeline (Shiki) highlights them.
    const codes = (ct!.children ?? []).map((c) => c.children?.[0] as unknown as { type: string; lang: string; value: string });
    expect(codes.map((c) => [c.type, c.lang])).toEqual([
      ['code', 'cpp'],
      ['code', 'cpp'],
      ['code', 'java'],
      ['code', 'python'],
      ['code', 'python'],
    ]);
    expect(codes[0]!.value).toBe('int f() { return 1; }');
    expect(codes[1]!.value).toBe('#include <iostream>\nint f() { return 1; }\nint main() { std::cout << f() << "\\n"; }');
    expect(codes[4]!.value).toBe('def f():\n    return 1\nprint(f())');

    const tabs = parseTabsProp(attrOf(ct!, 'tabs'));
    expect(tabs.map((t) => [t.lang, t.hasDriver])).toEqual([
      ['cpp', true],
      ['java', false],
      ['python', true],
    ]);
    // The run link carries the full program, not just the solution.
    expect(decodeGodboltUrl(tabs[0]!.runUrl).sessions[0]!.source).toBe(codes[1]!.value + '\n');
    expect(decodeGodboltUrl(tabs[1]!.runUrl).sessions[0]!.source).toBe('class Solution {}\n');
    expect(attrOf(ct!, 'uid')).toBe('ct-1');
  });

  it('leaves code outside <CodeTabs> alone and numbers multiple widgets', () => {
    const tree = transform(mdx + '\n\n<CodeTabs>\n\n' + fence('py', 'x = 1') + '\n\n</CodeTabs>\n') as unknown as J;
    const all = findAll(tree, 'CodeTabs');
    expect(all.map((n) => attrOf(n, 'uid'))).toEqual(['ct-1', 'ct-2']);
    const last = tree.children!.filter((c) => c.type === 'code');
    expect(last).toHaveLength(1);
  });

  it.each([
    ['prose inside', '<CodeTabs>\n\nhello\n\n' + fence('cpp', 'x') + '\n\n</CodeTabs>', /only contain fenced code/],
    ['unknown language', '<CodeTabs>\n\n' + fence('go', 'x') + '\n\n</CodeTabs>', /unsupported language "go"/],
    ['duplicate solution', '<CodeTabs>\n\n' + fence('cpp', 'a') + '\n\n' + fence('c++', 'b') + '\n\n</CodeTabs>', /two solution blocks for cpp/],
    ['driver only', '<CodeTabs>\n\n' + fence('java driver', 'a') + '\n\n</CodeTabs>', /driver but no solution/],
    ['unknown meta', '<CodeTabs>\n\n' + fence('cpp title="x"', 'a') + '\n\n</CodeTabs>', /unknown fence meta/],
    ['empty', '<CodeTabs>\n</CodeTabs>', /is empty/],
  ])('fails the build on %s, naming the file', (_name, src, re) => {
    expect(() => transform(src, 'x.mdx')).toThrow(CodeTabsError);
    expect(() => transform(src, 'x.mdx')).toThrow(re);
    expect(() => transform(src, 'x.mdx')).toThrow(/^x\.mdx: /);
  });
});

// Guard for the bulk conversion: every DSA page that uses <CodeTabs> must
// parse, and have all three languages, each with a driver.
describe('DSA pages using <CodeTabs>', () => {
  const files = readdirSync('src/content/dsa', { recursive: true, encoding: 'utf8' })
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => path.join('src/content/dsa', f))
    .filter((f) => readFileSync(f, 'utf8').includes('<CodeTabs>'));

  it('includes the reference page', () => {
    expect(files).toContain(path.join('src/content/dsa', '01-two-pointers', 'two-sum-sorted.mdx'));
  });

  it.each(files)('%s has C++, Java and Python with drivers', (file) => {
    const body = readFileSync(file, 'utf8').replace(/^---[\s\S]*?\n---\n/, '');
    const tree = parser.parse(body) as unknown as J;
    for (const ct of findAll(tree, 'CodeTabs')) {
      const parts = collectParts((ct.children ?? []) as never);
      expect([...parts.keys()].sort()).toEqual(['cpp', 'java', 'python']);
      for (const p of parts.values()) expect(p.driver).toBeTruthy();
    }
  });
});
