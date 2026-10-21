// Pure helpers behind scripts/verify-lld.ts and the "Run this program
// online" link on LLD (machine-coding) notes.
//
// Authoring markers, on the fence info line:
//   ```java run                        the note's one complete program (has main)
//   ```text output                     the demo output that program prints
//   ```text output nondeterministic    output varies run to run: CI only
//                                      checks that the program exits 0
//
// No Node-only APIs, so the remark plugin, the CLI and the tests share it.

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';

export const RUN_META = 'run';
export const OUTPUT_META = 'output';
export const NONDETERMINISTIC_META = 'nondeterministic';

/** Meta words on a fence: ```java run → ['run']. */
export function metaWords(meta: string | null | undefined): string[] {
  return (meta ?? '').split(/\s+/).filter(Boolean);
}

export interface LldProgram {
  code: string;
  /** 1-based line of the opening fence, when the parser reports it. */
  line?: number;
}

export interface LldOutput {
  text: string;
  nondeterministic: boolean;
  line?: number;
}

export interface LldBlocks {
  program?: LldProgram;
  output?: LldOutput;
  /** Authoring mistakes: duplicate markers. */
  errors: string[];
}

type CodeLike = {
  type: string;
  lang?: string | null;
  meta?: string | null;
  value?: string;
  position?: { start?: { line?: number } };
  children?: CodeLike[];
};

/** Collect the `java run` and `output` blocks from a parsed mdast tree. */
export function extractLldBlocks(tree: unknown): LldBlocks {
  const res: LldBlocks = { errors: [] };
  const visit = (n: CodeLike) => {
    if (n.type === 'code') {
      const words = metaWords(n.meta);
      const line = n.position?.start?.line;
      if (n.lang === 'java' && words.includes(RUN_META)) {
        if (res.program) res.errors.push(`second \`java ${RUN_META}\` block at line ${line ?? '?'}`);
        else res.program = { code: n.value ?? '', line };
      } else if (words.includes(OUTPUT_META)) {
        if (res.output) res.errors.push(`second \`${OUTPUT_META}\` block at line ${line ?? '?'}`);
        else
          res.output = {
            text: n.value ?? '',
            nondeterministic: words.includes(NONDETERMINISTIC_META),
            line,
          };
      }
    }
    for (const c of n.children ?? []) visit(c);
  };
  visit(tree as CodeLike);
  return res;
}

const parser = unified().use(remarkParse).use(remarkMdx);

/** Drop YAML frontmatter, keeping its lines so reported line numbers match the file. */
function blankFrontmatter(src: string): string {
  const m = /^---\r?\n[\s\S]*?\r?\n---\r?\n/.exec(src);
  return m ? m[0].replace(/[^\n]/g, '') + src.slice(m[0].length) : src;
}

/** Parse an MDX note and collect its LLD blocks. */
export function findLldBlocks(mdxSource: string): LldBlocks {
  return extractLldBlocks(parser.parse(blankFrontmatter(mdxSource)));
}

const PUBLIC_TOP_LEVEL =
  /^public\s+(?:(?:final|abstract|sealed|non-sealed|strictfp)\s+)*(?:class|record|enum|interface)\s+([A-Za-z_$][\w$]*)/gm;

/**
 * The class to run, which is also the file name javac needs: the single
 * public top-level type (column 0), or Main when there is none. Throws when
 * there are several, since one .java file can hold only one.
 */
export function mainClassName(code: string): string {
  const names = [...code.matchAll(PUBLIC_TOP_LEVEL)].map((m) => m[1]);
  if (names.length > 1) {
    throw new Error(`more than one public top-level type: ${names.join(', ')}`);
  }
  return names[0] ?? 'Main';
}

/** CRLF → LF, no trailing whitespace on any line, no trailing blank lines. */
export function normalizeOutput(s: string): string {
  return s
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.replace(/\s+$/, ''))
    .join('\n')
    .replace(/\n+$/, '');
}

export interface Comparison {
  ok: boolean;
  /** Line diff, `-` expected / `+` actual / two-space context; empty when ok. */
  diff: string;
}

/** Line-by-line diff (LCS); outputs here are small. */
export function diffLines(expected: string[], actual: string[]): string[] {
  const n = expected.length;
  const m = actual.length;
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      lcs[i][j] =
        expected[i] === actual[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  const out: string[] = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && expected[i] === actual[j]) {
      out.push('  ' + expected[i]);
      i++;
      j++;
    } else if (j < m && (i === n || lcs[i][j + 1] >= lcs[i + 1][j])) {
      out.push('+ ' + actual[j++]);
    } else {
      out.push('- ' + expected[i++]);
    }
  }
  return out;
}

/** Compare a program's stdout with the note's demo output, after normalising both. */
export function compareOutput(expected: string, actual: string): Comparison {
  const e = normalizeOutput(expected);
  const a = normalizeOutput(actual);
  if (e === a) return { ok: true, diff: '' };
  return { ok: false, diff: diffLines(e.split('\n'), a.split('\n')).join('\n') };
}
