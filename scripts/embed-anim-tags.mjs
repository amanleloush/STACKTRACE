#!/usr/bin/env node
/**
 * One-shot: re-insert <Anim id="X" /> tags into the sysviz DSA MDX notes
 * that were ported from brain-detox-arc.
 *
 * The parallel .md -> .mdx port dropped every
 *   <div class="dsa-viz" data-algo="X"></div>
 * block. This script walks the brain-detox source tree, extracts each
 * file's data-algo value (the first one if multiple), maps the source
 * filename to the sysviz target slug, and inserts
 *   \n<Anim id="X" />\n
 * immediately above the first `## Complexity` header (or `## Pitfalls`
 * as a fallback) in the target MDX file.
 *
 * Idempotent: target files that already contain `<Anim id=` are skipped.
 *
 * Run with:  node scripts/embed-anim-tags.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SOURCE_ROOT = '/Users/amansinghchauhan/Downloads/brain-detox-arc/docs/11-dsa';
const TARGET_ROOT = path.join(ROOT, 'src/content/dsa');

// Special-case source-stem -> target-slug renames. Stem = filename without
// the leading "NN-" prefix and without the .md extension. Anything not in
// this map falls back to the identity rule (drop NN- prefix, keep rest).
const SLUG_RENAMES = {
  '3sum': 'three-sum',
  'valid-parens': 'valid-parentheses',
  'merge-two-sorted': 'merge-two-sorted-lists',
  'next-greater': 'next-greater-element',
  'remove-nth-end': 'remove-nth-from-end',
  // Sources whose own stem already differs from target slug:
  'cycle-floyd': 'cycle-floyd', // identity but explicit for clarity
  // From spec:
  'classic': 'binary-search-classic',
  'search-on-answer': 'search-on-answer',
  '2d-matrix': 'search-2d-matrix',
  'median-of-two': 'median-of-two-sorted',
  'rotated-sorted': 'rotated-sorted',
  'level-order': 'level-order-traversal',
  'cycle-detection': 'cycle-detection',
  'generate-parentheses': 'generate-parentheses',
  'huffman': 'huffman-coding',
  'intervals': 'interval-scheduling',
  'kruskal': 'kruskal-mst',
  'prim': 'prim-mst',
  'lis': 'longest-increasing-subsequence',
  'lcs': 'longest-common-subsequence',
  'fibonacci': 'dp-fibonacci',
  'topological-sort': 'topological-sort',
  'merge': 'mergesort',
  'quick': 'quicksort',
  'dijkstra': 'dijkstra-shortest-path',
  // BFS / DFS / etc subfolder stems that match identity:
  'bfs-graph': 'bfs-graph',
  'bfs-grid': 'bfs-grid',
  'multi-source': 'multi-source-bfs',
  // sorting prefix-only stems:
  'bubble': 'bubble-sort',
  'insertion': 'insertion-sort',
  'selection': 'selection-sort',
  'heap': 'heap-sort',
  'counting': 'counting-sort',
  'radix': 'radix-sort',
  // linked-list:
  'reverse': 'reverse-linked-list',
  // trie:
  'insert-search': 'trie-insert-search',
  // bit-manipulation single-number target == identity, but data-algo differs
  'single-number': 'single-number',
};

// Per-file data-algo override only for trie-insert-search (file has both
// `trie-insert` and `trie-search` registered; per spec we always insert
// `trie-insert`). All other algo values come straight from the source file.
const ALGO_OVERRIDES = {
  '11-trie/01-insert-search.md': 'trie-insert',
};

function defaultSlug(stem) {
  return SLUG_RENAMES[stem] ?? stem;
}

function listSourceFiles() {
  const out = [];
  for (const phase of fs.readdirSync(SOURCE_ROOT)) {
    const phaseDir = path.join(SOURCE_ROOT, phase);
    if (!fs.statSync(phaseDir).isDirectory()) continue;
    for (const file of fs.readdirSync(phaseDir)) {
      if (!file.endsWith('.md')) continue;
      out.push({ phase, file, abs: path.join(phaseDir, file) });
    }
  }
  return out.sort((a, b) => (a.phase + a.file).localeCompare(b.phase + b.file));
}

function stemOf(file) {
  // 05-3sum.md -> 3sum ; cheatsheet.md -> cheatsheet ; index.md -> index
  const base = file.replace(/\.md$/, '');
  return base.replace(/^[0-9]{2}-/, '');
}

function extractDataAlgo(text) {
  const m = text.match(/<div\s+class=["']dsa-viz["']\s+data-algo=["']([^"']+)["']\s*>\s*<\/div>/);
  return m ? m[1] : null;
}

function targetMdxPath(phase, slug) {
  return path.join(TARGET_ROOT, phase, `${slug}.mdx`);
}

function insertAnimTag(mdxText, animId) {
  // Idempotency: anything already containing <Anim id= ... is a no-op.
  if (/<Anim\s+id=/.test(mdxText)) return { kind: 'skipped-idempotent', text: mdxText };

  // Prefer `## Complexity`, fall back to `## Pitfalls`. Match start-of-line.
  const headingRe = /^## (Complexity|Pitfalls)\b/m;
  const match = mdxText.match(headingRe);
  if (!match) return { kind: 'no-anchor', text: mdxText };

  const idx = match.index;
  const before = mdxText.slice(0, idx);
  const after = mdxText.slice(idx);
  const insert = `<Anim id="${animId}" />\n\n`;
  return { kind: 'inserted', text: before + insert + after };
}

function main() {
  const tally = {
    inserted: 0,
    'skipped-idempotent': 0,
    'no-source-anim': 0,
    'target-missing': 0,
    'no-anchor': 0,
  };
  const log = [];

  for (const { phase, file, abs } of listSourceFiles()) {
    const text = fs.readFileSync(abs, 'utf8');
    const overrideKey = `${phase}/${file}`;
    const animId = ALGO_OVERRIDES[overrideKey] ?? extractDataAlgo(text);
    if (!animId) {
      tally['no-source-anim'] += 1;
      continue; // not every source has an anim — index/cheatsheet/etc.
    }
    const slug = defaultSlug(stemOf(file));
    const targetPath = targetMdxPath(phase, slug);
    if (!fs.existsSync(targetPath)) {
      tally['target-missing'] += 1;
      log.push(`MISS  ${phase}/${file} -> ${path.relative(ROOT, targetPath)}`);
      continue;
    }
    const mdx = fs.readFileSync(targetPath, 'utf8');
    const { kind, text: nextText } = insertAnimTag(mdx, animId);
    tally[kind] += 1;
    log.push(`${kind.padEnd(20)} ${path.relative(ROOT, targetPath)}  (id="${animId}")`);
    if (kind === 'inserted') {
      fs.writeFileSync(targetPath, nextText);
    }
  }

  console.log('--- per-file outcomes ---');
  for (const line of log) console.log(line);
  console.log('\n--- tally ---');
  for (const [k, v] of Object.entries(tally)) console.log(`${k.padEnd(20)} ${v}`);
}

main();
