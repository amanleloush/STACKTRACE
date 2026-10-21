// CLI: compile and run the complete Java program on every LLD note and check
// that it prints the demo output shown in the note.
//
//   node --experimental-strip-types --no-warnings scripts/verify-lld.ts \
//     [-v] [src/content/notes/14-lld/lld-atm.mdx ...]
//
// With no files it checks every src/content/notes/14-lld/lld-*.mdx. The
// program is the ```java run block, the expected output the ```text output
// block (see src/lib/lld-verify.ts). Needs javac + java 21 on PATH. Each
// program is written to <PublicClass>.java (Main.java by default), compiled
// with `javac --release 21` and run with a 20 s timeout. Prints OK / DIFF /
// FAIL / SKIP per note and exits non-zero on any DIFF or FAIL. An output
// block marked `nondeterministic` is not compared, but the program must
// still exit 0. Runs in CI only (.github/workflows/ci.yml, lld-solutions).

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { compareOutput, findLldBlocks, mainClassName } from '../src/lib/lld-verify.ts';

const LLD_DIR = 'src/content/notes/14-lld';
const RUN_TIMEOUT_MS = 20_000;
const COMPILE_TIMEOUT_MS = 120_000;

const run = (cmd: string, args: string[], cwd: string, timeout: number) =>
  execFileSync(cmd, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout,
    maxBuffer: 16 * 1024 * 1024,
  });

const verbose = process.argv.includes('-v');
let files = process.argv.slice(2).filter((a) => a !== '-v');
if (files.length === 0) {
  files = readdirSync(LLD_DIR)
    .filter((f) => /^lld-.*\.mdx$/.test(f))
    .sort()
    .map((f) => path.join(LLD_DIR, f));
}

let failed = 0;
let checked = 0;
for (const file of files) {
  const blocks = findLldBlocks(readFileSync(file, 'utf8'));
  if (blocks.errors.length) {
    failed++;
    console.log(`FAIL ${file}: ${blocks.errors.join('; ')}`);
    continue;
  }
  if (!blocks.program) {
    console.log(`SKIP ${file}: no \`java run\` block`);
    continue;
  }
  checked++;
  let cls: string;
  try {
    cls = mainClassName(blocks.program.code);
  } catch (e) {
    failed++;
    console.log(`FAIL ${file}: ${(e as Error).message}`);
    continue;
  }
  const dir = mkdtempSync(path.join(tmpdir(), 'lld-'));
  try {
    writeFileSync(path.join(dir, `${cls}.java`), blocks.program.code.replace(/\s*$/, '\n'));
    run('javac', ['--release', '21', '-d', '.', `${cls}.java`], dir, COMPILE_TIMEOUT_MS);
    const stdout = run('java', ['-Dstdout.encoding=UTF-8', '-cp', '.', cls], dir, RUN_TIMEOUT_MS);
    if (!blocks.output) {
      console.log(`OK   ${file}: ran ${cls} (no \`output\` block to compare)`);
    } else if (blocks.output.nondeterministic) {
      console.log(`OK   ${file}: ran ${cls}, exit 0 (output marked nondeterministic, not compared)`);
    } else {
      const cmp = compareOutput(blocks.output.text, stdout);
      if (cmp.ok) {
        console.log(`OK   ${file}: ${cls} output matches the note`);
      } else {
        failed++;
        console.log(`DIFF ${file}: ${cls} output differs from the note (- note, + actual)\n${cmp.diff}`);
      }
    }
    if (verbose) console.log(stdout);
  } catch (e) {
    failed++;
    const err = e as { stdout?: string; stderr?: string; message?: string; signal?: string };
    const why = err.signal === 'SIGTERM' ? ' (timed out)' : '';
    console.log(`FAIL ${file}${why}\n${err.stderr || err.message}`);
    if (verbose && err.stdout) console.log(`--- stdout\n${err.stdout}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
console.log(`${checked} programs checked, ${failed} failed`);
process.exit(failed ? 1 : 0);
