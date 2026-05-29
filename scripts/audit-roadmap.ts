#!/usr/bin/env node
// Verify the landing-page roadmap is structurally sound after a build:
// - both pillar containers present in SSR HTML
// - chip count equals (systems notes + DSA notes) from the collections
// - every chip href resolves to a `/learn/<pillar>/<slug>/` we actually
//   built (catches a roadmap → route mismatch the link audit would also
//   flag, but with a clearer message)
//
// Usage: npm run audit:roadmap   (after npm run build)

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = fileURLToPath(new URL('..', import.meta.url));
const DIST = path.join(REPO, 'dist');

async function readFile(p: string): Promise<string> {
  return fs.readFile(p, 'utf8');
}

async function listMdx(dir: string): Promise<string[]> {
  const out: string[] = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) out.push(...(await listMdx(full)));
      else if (e.isFile() && (e.name.endsWith('.mdx') || e.name.endsWith('.md'))) out.push(full);
    }
  } catch {
    /* dir missing */
  }
  return out;
}

async function main(): Promise<void> {
  const index = await readFile(path.join(DIST, 'roadmap', 'index.html'));

  const sysFiles = (await listMdx(path.join(REPO, 'src/content/notes'))).length;
  const dsaFiles = (await listMdx(path.join(REPO, 'src/content/dsa'))).length;
  const expectedChips = sysFiles + dsaFiles;

  const chipCount = (index.match(/class="roadmap__chip"/g) ?? []).length;
  if (chipCount !== expectedChips) {
    console.error(`[roadmap] ✗ chip count: got ${chipCount}, expected ${expectedChips}`);
    process.exit(1);
  }
  console.log(`[roadmap] ✓ ${chipCount} chips (${sysFiles} systems + ${dsaFiles} dsa)`);

  for (const pillar of ['systems', 'dsa']) {
    if (!index.includes(`roadmap__pillar--${pillar}`)) {
      console.error(`[roadmap] ✗ pillar container missing: ${pillar}`);
      process.exit(1);
    }
  }
  console.log('[roadmap] ✓ both pillar containers present');

  // Pre-collect slugs for SSR routes — those don't emit static HTML.
  const noteSlugs = new Set((await listMdx(path.join(REPO, 'src/content/notes'))).map(
    (p) => path.basename(p, path.extname(p)),
  ));
  const dsaSlugs = new Set((await listMdx(path.join(REPO, 'src/content/dsa'))).map(
    (p) => path.basename(p, path.extname(p)),
  ));

  const hrefs = [...index.matchAll(/class="roadmap__chip"\s+href="([^"]+)"/g)].map((m) => m[1]!);
  let bad = 0;
  for (const href of hrefs) {
    let resolved = false;
    if (href.startsWith('/learn/notes/')) {
      const slug = href.slice('/learn/notes/'.length).replace(/\/$/, '');
      resolved = noteSlugs.has(slug);
    } else if (href.startsWith('/learn/dsa/')) {
      const slug = href.slice('/learn/dsa/'.length).replace(/\/$/, '');
      resolved = dsaSlugs.has(slug);
    } else {
      try {
        await fs.access(path.join(DIST, href.replace(/\/$/, ''), 'index.html'));
        resolved = true;
      } catch { /* static target missing */ }
    }
    if (!resolved) {
      console.error(`[roadmap] ✗ chip href has no built page or source: ${href}`);
      bad++;
    }
  }
  if (bad > 0) process.exit(1);
  console.log(`[roadmap] ✓ all ${hrefs.length} chip hrefs resolve`);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
