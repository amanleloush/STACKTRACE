// Build the Pagefind search index after `astro build`.
//
//   node --experimental-strip-types --no-warnings scripts/build-search-index.ts
//
// Indexes the prerendered HTML in dist/ (as `pagefind --site dist` did),
// plus records for every note and DSA page read straight from the MDX,
// since those routes are Worker-rendered and never exist as HTML in dist/.
// See scripts/search-records.ts for the record shapes.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as pagefind from 'pagefind';
import { buildPageRecords, type Kind } from './search-records.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

const COLLECTIONS: { kind: Kind; dir: string }[] = [
  { kind: 'Note', dir: path.join(ROOT, 'src/content/notes') },
  { kind: 'DSA', dir: path.join(ROOT, 'src/content/dsa') },
];

function fail(what: string, errors: string[]): never {
  console.error(`[search-index] ${what}:\n  ${errors.join('\n  ')}`);
  process.exit(1);
}

async function main(): Promise<void> {
  const started = Date.now();
  const { index, errors } = await pagefind.createIndex({ forceLanguage: 'en' });
  if (!index) fail('could not create index', errors);

  // 1. Static pages. dist/_worker.js holds the server bundle, no HTML,
  //    so the default glob only picks up prerendered pages.
  const dir = await index.addDirectory({ path: DIST });
  if (dir.errors.length) fail('indexing dist/ failed', dir.errors);

  // 2. Notes + DSA, one page record and one record per `##` section.
  const counts: Record<Kind, { pages: number; sections: number }> = {
    Note: { pages: 0, sections: 0 },
    DSA: { pages: 0, sections: 0 },
  };
  for (const { kind, dir: base } of COLLECTIONS) {
    const files = (await fs.readdir(base, { recursive: true }))
      .filter((f) => /\.mdx?$/.test(f))
      .sort();
    for (const file of files) {
      const raw = await fs.readFile(path.join(base, file), 'utf8');
      let recs;
      try {
        recs = buildPageRecords({ kind, file, raw });
      } catch (e) {
        fail(`${kind} ${file}`, [String(e)]);
      }
      if (!recs) continue;
      // The Pagefind service handles requests concurrently, so send a
      // page's records together rather than one round-trip at a time.
      const results = await Promise.all([
        index.addHTMLFile({ url: recs.page.url, content: recs.page.html }),
        ...recs.sections.map((rec) => index.addCustomRecord(rec)),
      ]);
      const errs = results.flatMap((r) => r.errors);
      if (errs.length) fail(`${kind} ${file}`, errs);
      counts[kind].pages += 1;
      counts[kind].sections += recs.sections.length;
    }
  }

  const out = path.join(DIST, 'pagefind');
  await fs.rm(out, { recursive: true, force: true });
  const written = await index.writeFiles({ outputPath: out });
  if (written.errors.length) fail('writing index failed', written.errors);
  await pagefind.close();

  console.log(
    `[search-index] ${dir.page_count} static pages, ` +
      `${counts.Note.pages} notes (${counts.Note.sections} sections), ` +
      `${counts.DSA.pages} DSA pages (${counts.DSA.sections} sections) ` +
      `→ ${path.relative(ROOT, out)} in ${((Date.now() - started) / 1000).toFixed(1)}s`,
  );
}

await main();
