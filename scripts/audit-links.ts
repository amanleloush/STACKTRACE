#!/usr/bin/env node
// Walk every dist/**/*.html, extract every internal `<a href="/...">`, and
// verify each one resolves to a real built page (or static asset). Catches
// stale link rewrites the codemod missed, broken phase transitions in
// /notes/, and dangling href targets in /learn/.
//
// Usage: npm run audit:links   (after npm run build)

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = fileURLToPath(new URL('..', import.meta.url));
const DIST = path.join(REPO, 'dist');

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'pagefind' || e.name === '_worker.js' || e.name === '_astro') continue;
      out.push(...(await walk(full)));
    } else if (e.isFile() && e.name.endsWith('.html')) {
      out.push(full);
    }
  }
  return out;
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

interface Broken {
  source: string;
  href: string;
}

async function main(): Promise<void> {
  const htmls = await walk(DIST);
  if (htmls.length === 0) {
    console.error('[audit] dist/ is empty — did you run `npm run build`?');
    process.exit(1);
  }
  console.log(`[audit] scanning ${htmls.length} html files`);

  const broken: Broken[] = [];
  let totalChecked = 0;

  for (const file of htmls) {
    const html = await fs.readFile(file, 'utf8');
    const hrefs = [...html.matchAll(/<a[^>]+href="([^"]+)"/g)].map((m) => m[1]!);
    for (const href of hrefs) {
      // Skip external, anchor-only, mailto, etc.
      if (!href.startsWith('/')) continue;
      // Strip query/anchor for filesystem check.
      const pathOnly = href.split('#')[0]!.split('?')[0]!;
      // Astro emits trailing-slash URLs; the file is `<dir>/index.html`.
      const candidates = [
        path.join(DIST, pathOnly.replace(/\/$/, ''), 'index.html'),
        path.join(DIST, pathOnly),                       // already a file path
        path.join(DIST, pathOnly.replace(/^\//, '')),    // static assets
      ];
      let ok = false;
      for (const c of candidates) {
        if (await fileExists(c)) {
          ok = true;
          break;
        }
      }
      totalChecked++;
      if (!ok) broken.push({ source: path.relative(DIST, file), href });
    }
  }

  console.log(`[audit] checked ${totalChecked} internal links`);
  if (broken.length === 0) {
    console.log('[audit] ✓ all internal links resolve');
    return;
  }
  console.error(`[audit] ✗ ${broken.length} broken links:`);
  for (const b of broken) console.error(`  ${b.source}  →  ${b.href}`);
  process.exit(1);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
