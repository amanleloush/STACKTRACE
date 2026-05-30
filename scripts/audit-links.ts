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

// SSR routes don't emit static HTML. For these prefixes we verify the link
// target against the underlying source collection instead of dist/.
const SSR_PREFIXES = [
  { prefix: '/learn/notes/', collectionDir: 'src/content/notes' },
  { prefix: '/learn/dsa/', collectionDir: 'src/content/dsa' },
];
const SSR_KNOWN_PATHS = new Set([
  '/login/', '/login',
  '/account/', '/account',
  '/account/api-keys/', '/account/api-keys',
  '/admin/', '/admin',
  '/admin/content/', '/admin/content',
  '/pricing/', '/pricing',
]);
// SSR prefixes whose actual paths we don't try to enumerate.
const SSR_DYNAMIC_PREFIXES = ['/api/'];

async function collectSsrSlugs(): Promise<Map<string, Set<string>>> {
  const out = new Map<string, Set<string>>();
  for (const { prefix, collectionDir } of SSR_PREFIXES) {
    const slugs = new Set<string>();
    const dir = path.join(REPO, collectionDir);
    try {
      const stack = [dir];
      while (stack.length) {
        const cur = stack.pop()!;
        const entries = await fs.readdir(cur, { withFileTypes: true });
        for (const e of entries) {
          const full = path.join(cur, e.name);
          if (e.isDirectory()) stack.push(full);
          else if (e.isFile() && (e.name.endsWith('.mdx') || e.name.endsWith('.md'))) {
            slugs.add(e.name.replace(/\.(mdx?|md)$/, ''));
          }
        }
      }
    } catch { /* dir missing — empty collection */ }
    out.set(prefix, slugs);
  }
  return out;
}

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

  const ssrSlugs = await collectSsrSlugs();
  const broken: Broken[] = [];
  let totalChecked = 0;
  let ssrChecked = 0;

  for (const file of htmls) {
    const html = await fs.readFile(file, 'utf8');
    const hrefs = [...html.matchAll(/<a[^>]+href="([^"]+)"/g)].map((m) => m[1]!);
    for (const href of hrefs) {
      if (!href.startsWith('/')) continue;
      const pathOnly = href.split('#')[0]!.split('?')[0]!;
      totalChecked++;

      // SSR collection routes — verify the underlying entry exists.
      const ssrMatch = SSR_PREFIXES.find((s) => pathOnly.startsWith(s.prefix));
      if (ssrMatch) {
        const slug = pathOnly.slice(ssrMatch.prefix.length).replace(/\/$/, '');
        if (ssrSlugs.get(ssrMatch.prefix)!.has(slug)) {
          ssrChecked++;
          continue;
        }
        broken.push({ source: path.relative(DIST, file), href });
        continue;
      }

      // Other known SSR routes — file existence isn't a useful check.
      const trimmed = pathOnly.replace(/\/$/, '');
      if (SSR_KNOWN_PATHS.has(pathOnly) || SSR_KNOWN_PATHS.has(trimmed)) {
        ssrChecked++;
        continue;
      }
      if (SSR_DYNAMIC_PREFIXES.some((p) => pathOnly.startsWith(p))) {
        ssrChecked++;
        continue;
      }

      // Static — must exist in dist/ as HTML, file, or asset.
      const candidates = [
        path.join(DIST, pathOnly.replace(/\/$/, ''), 'index.html'),
        path.join(DIST, pathOnly),
        path.join(DIST, pathOnly.replace(/^\//, '')),
      ];
      let ok = false;
      for (const c of candidates) {
        if (await fileExists(c)) { ok = true; break; }
      }
      if (!ok) broken.push({ source: path.relative(DIST, file), href });
    }
  }
  console.log(`[audit] ${ssrChecked} links resolved against SSR collections`);

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
