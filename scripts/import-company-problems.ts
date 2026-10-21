#!/usr/bin/env node
// Import company-wise LeetCode problem lists into committed JSON.
//
// Source: https://github.com/liquidslr/leetcode-company-wise-problems
// (no license file — the /dsa/companies/ section stays free for everyone and
// credits the repo on every page).
//
// Usage:
//   npm run import:companies
//   npm run import:companies -- --src=/path/to/existing/checkout
//   npm run import:companies -- --min=40 --top=100
//
// Without --src it shallow-clones the repo into a fresh OS temp dir (never
// inside this repo) and deletes it afterwards. Outputs:
//   src/data/companies/index.json        — company summaries + source commit
//   src/data/companies/<company>.json    — top-N problems per company
//   src/data/problems.json               — slug → metadata + companies[]

import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  buildProblemIndex,
  companyDisplayName,
  companySlug,
  parseCompanyCsv,
  selectTopProblems,
  summarize,
  type CompaniesIndex,
  type CompanyFile,
  type RecentSets,
} from '../src/lib/company-problems.ts';

const REPO = 'liquidslr/leetcode-company-wise-problems';
const REPO_URL = `https://github.com/${REPO}`;

const FILES = {
  d30: '1. Thirty Days.csv',
  m3: '2. Three Months.csv',
  m6: '3. Six Months.csv',
  all: '5. All.csv',
} as const;

function readFlag(name: string, fallback: string): string {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

const minProblems = Number.parseInt(readFlag('min', '40'), 10);
const topN = Number.parseInt(readFlag('top', '100'), 10);
const outRoot = path.resolve(process.cwd(), 'src/data');
const outCompanies = path.join(outRoot, 'companies');

async function readIfExists(file: string): Promise<string | null> {
  try {
    return await fs.readFile(file, 'utf8');
  } catch {
    return null;
  }
}

async function slugSet(dir: string, file: string): Promise<Set<string>> {
  const text = await readIfExists(path.join(dir, file));
  return new Set(text ? parseCompanyCsv(text).map((r) => r.slug) : []);
}

/** Pretty top level, one problem per line — readable diffs, modest size. */
function stringifyCompany(file: CompanyFile): string {
  const head = { name: file.name, slug: file.slug, sourceCount: file.sourceCount };
  const rows = file.problems.map((p) => '    ' + JSON.stringify(p)).join(',\n');
  const prefix = JSON.stringify(head, null, 2).replace(/\n}$/, '');
  return `${prefix},\n  "problems": [\n${rows}\n  ]\n}\n`;
}

function stringifyProblems(index: Record<string, unknown>): string {
  const rows = Object.entries(index).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`);
  return `{\n${rows.join(',\n')}\n}\n`;
}

async function main(): Promise<void> {
  let srcDir = readFlag('src', '');
  let tmpDir: string | null = null;
  if (!srcDir) {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lc-company-'));
    srcDir = path.join(tmpDir, 'repo');
    console.log(`[import] cloning ${REPO_URL} → ${srcDir}`);
    execFileSync('git', ['clone', '--depth', '1', '--quiet', `${REPO_URL}.git`, srcDir], {
      stdio: ['ignore', 'inherit', 'inherit'],
    });
  }

  try {
    const commit = execFileSync('git', ['-C', srcDir, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    const committedAt = execFileSync('git', ['-C', srcDir, 'log', '-1', '--format=%cI'], {
      encoding: 'utf8',
    }).trim();

    const entries = await fs.readdir(srcDir, { withFileTypes: true });
    const files: CompanyFile[] = [];
    let considered = 0;
    for (const ent of entries) {
      if (!ent.isDirectory() || ent.name.startsWith('.')) continue;
      const dir = path.join(srcDir, ent.name);
      const allText = await readIfExists(path.join(dir, FILES.all));
      if (!allText) continue;
      considered++;
      const all = parseCompanyCsv(allText);
      if (all.length < minProblems) continue;

      const sets: RecentSets = {
        d30: await slugSet(dir, FILES.d30),
        m3: await slugSet(dir, FILES.m3),
        m6: await slugSet(dir, FILES.m6),
      };
      const name = companyDisplayName(ent.name);
      files.push({
        name,
        slug: companySlug(name),
        sourceCount: all.length,
        problems: selectTopProblems(all, sets, topN),
      });
    }

    // Biggest lists first — also fixes the order of problems.json companies[].
    files.sort((a, b) => b.sourceCount - a.sourceCount || a.name.localeCompare(b.name));
    const dupes = files.map((f) => f.slug).filter((s, i, a) => a.indexOf(s) !== i);
    if (dupes.length) throw new Error(`company slug collision: ${dupes.join(', ')}`);

    // Wipe stale per-company files so a company dropping below --min disappears.
    await fs.rm(outCompanies, { recursive: true, force: true });
    await fs.mkdir(outCompanies, { recursive: true });

    for (const f of files) {
      await fs.writeFile(path.join(outCompanies, `${f.slug}.json`), stringifyCompany(f));
    }
    const index: CompaniesIndex = {
      source: { repo: REPO, url: REPO_URL, commit, committedAt },
      minProblems,
      topN,
      companies: files.map(summarize),
    };
    await fs.writeFile(path.join(outCompanies, 'index.json'), JSON.stringify(index, null, 2) + '\n');
    const problems = buildProblemIndex(files);
    await fs.writeFile(path.join(outRoot, 'problems.json'), stringifyProblems(problems));

    const sizeOf = async (p: string): Promise<number> => (await fs.stat(p)).size;
    let companyBytes = 0;
    for (const f of files) companyBytes += await sizeOf(path.join(outCompanies, `${f.slug}.json`));
    const kb = (n: number): string => `${(n / 1024).toFixed(1)} KB`;
    console.log(`[import] source ${commit.slice(0, 7)} (${committedAt})`);
    console.log(`[import] ${files.length}/${considered} companies with ≥ ${minProblems} problems, top ${topN} each`);
    console.log(`[import] ${Object.keys(problems).length} unique problems`);
    console.log(`[import] companies/*.json ${kb(companyBytes)} · index.json ${kb(await sizeOf(path.join(outCompanies, 'index.json')))} · problems.json ${kb(await sizeOf(path.join(outRoot, 'problems.json')))}`);
  } finally {
    if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

await main();
