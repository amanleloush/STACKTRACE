// CLI: compile and run every <CodeTabs> program in the given MDX files with
// the local toolchains, and check that all languages print the same output.
//
//   node --experimental-strip-types --no-warnings src/lib/code-tabs-verify.ts \
//     src/content/dsa/01-two-pointers/two-sum-sorted.mdx [more.mdx ...]
//
// Needs g++ (or clang++ via CXX=clang++), javac + java (17+) and python3 on
// PATH. Each program is built exactly as the godbolt link would send it
// (solution spliced into its driver), except that Java keeps
// `public class Main` and is written to Main.java. Exits non-zero on any
// compile error, runtime error, or output mismatch. Prints outputs with -v.
//
// Lives in src/lib (rather than scripts/) beside the plugin it exercises.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import type { RootContent } from 'mdast';
import { assembleProgram, LANG_LABEL, TAB_LANGS, type TabLang } from './code-tabs.ts';
import { collectParts, COMPONENT_NAME } from './remark-code-tabs.ts';

type AnyNode = { type: string; name?: string | null; children?: AnyNode[] };

function findCodeTabs(node: AnyNode, out: AnyNode[] = []): AnyNode[] {
  if (node.type === 'mdxJsxFlowElement' && node.name === COMPONENT_NAME) out.push(node);
  for (const c of node.children ?? []) findCodeTabs(c, out);
  return out;
}

const run = (cmd: string, args: string[], cwd: string) =>
  execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60_000 });

function runProgram(lang: TabLang, program: string, dir: string): string {
  if (lang === 'cpp') {
    writeFileSync(path.join(dir, 'main.cpp'), program);
    run(process.env.CXX ?? 'g++', ['-std=c++20', '-O2', '-Wall', '-o', 'main', 'main.cpp'], dir);
    return run(path.join(dir, 'main'), [], dir);
  }
  if (lang === 'java') {
    writeFileSync(path.join(dir, 'Main.java'), program);
    run('javac', ['-d', '.', 'Main.java'], dir);
    return run('java', ['-cp', '.', 'Main'], dir);
  }
  writeFileSync(path.join(dir, 'main.py'), program);
  return run('python3', ['-I', 'main.py'], dir);
}

const verbose = process.argv.includes('-v');
const files = process.argv.slice(2).filter((a) => a !== '-v');
if (files.length === 0) {
  console.error('usage: code-tabs-verify.ts [-v] <file.mdx>...');
  process.exit(2);
}

const parser = unified().use(remarkParse).use(remarkMdx);
let failed = 0;
for (const file of files) {
  const src = readFileSync(file, 'utf8').replace(/^---[\s\S]*?\n---\n/, '');
  const blocks = findCodeTabs(parser.parse(src) as AnyNode);
  if (blocks.length === 0) {
    console.log(`SKIP ${file}: no <${COMPONENT_NAME}>`);
    continue;
  }
  blocks.forEach((block, i) => {
    const label = `${file} #${i + 1}`;
    const parts = collectParts((block.children ?? []) as RootContent[]);
    const outputs = new Map<TabLang, string>();
    for (const lang of TAB_LANGS) {
      const p = parts.get(lang);
      if (!p?.solution) continue;
      if (!p.driver) {
        console.log(`WARN ${label}: ${LANG_LABEL[lang]} has no driver, nothing to run`);
        continue;
      }
      const dir = mkdtempSync(path.join(tmpdir(), 'codetabs-'));
      try {
        outputs.set(lang, runProgram(lang, assembleProgram(p.solution, p.driver), dir));
      } catch (e) {
        failed++;
        const err = e as { stderr?: string; message?: string };
        console.log(`FAIL ${label}: ${LANG_LABEL[lang]}\n${err.stderr || err.message}`);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    }
    const distinct = new Set(outputs.values());
    if (outputs.size > 0 && distinct.size === 1) {
      console.log(`OK   ${label}: ${[...outputs.keys()].map((l) => LANG_LABEL[l]).join(', ')} agree`);
      if (verbose) console.log([...distinct][0]);
    } else if (outputs.size > 0) {
      failed++;
      console.log(`DIFF ${label}: outputs differ`);
      for (const [lang, out] of outputs) console.log(`--- ${LANG_LABEL[lang]}\n${out}`);
    }
  });
}
process.exit(failed ? 1 : 0);
