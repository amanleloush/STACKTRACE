#!/usr/bin/env node
/**
 * Scaffolds sysviz anim folders for every algorithm registered by the
 * brain-detox DSA engine. Idempotent — never overwrites an existing folder
 * (so the native ports under `src/anims/dijkstra/` etc. are safe).
 *
 * For each algo it generates:
 *   src/anims/<id>/meta.ts   — AnimMeta with title/caption/tags/phase/order
 *   src/anims/<id>/index.ts  — thin module that delegates to mountDsa()
 *
 * Title/caption are extracted via regex from the engine source. Phase + tags
 * come from the per-algo map below, mirroring the DSA content phases the
 * notes already use.
 */

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ENGINE_DIR = path.join(ROOT, 'src/lib/dsa-engine');
const ANIMS_DIR = path.join(ROOT, 'src/anims');

// Each entry: phase (matches DSA content slug) + tags (must be AnimTag enum)
// + order (display order within the phase). Algos not in this map default to
// no phase, [] tags, order 99 — they still ship and show in the gallery.
const ALGO_META = {
  // 01-two-pointers
  'reverse-array': { phase: '01-two-pointers', order: 1, tags: [] },
  'two-sum-sorted': { phase: '01-two-pointers', order: 2, tags: ['searching'] },
  'remove-duplicates': { phase: '01-two-pointers', order: 3, tags: [] },
  'container-most-water': { phase: '01-two-pointers', order: 4, tags: [] },
  '3sum': { phase: '01-two-pointers', order: 5, tags: [] },
  'trapping-rain-water': { phase: '01-two-pointers', order: 6, tags: [] },

  // 02-sliding-window
  'fixed-window-max': { phase: '02-sliding-window', order: 1, tags: [] },
  'longest-no-repeat': { phase: '02-sliding-window', order: 2, tags: ['string'] },
  'min-window-substring': { phase: '02-sliding-window', order: 3, tags: ['string'] },
  'longest-subarray-sum-k': { phase: '02-sliding-window', order: 4, tags: [] },
  'permutation-in-string': { phase: '02-sliding-window', order: 5, tags: ['string'] },

  // 03-binary-search
  'binary-search': { phase: '03-binary-search', order: 1, tags: ['searching'] },
  'first-last-occurrence': { phase: '03-binary-search', order: 2, tags: ['searching'] },
  'rotated-search': { phase: '03-binary-search', order: 3, tags: ['searching'] },
  'bsearch-on-answer': { phase: '03-binary-search', order: 4, tags: ['searching'] },
  '2d-matrix': { phase: '03-binary-search', order: 5, tags: ['searching'] },
  'median-of-two': { phase: '03-binary-search', order: 6, tags: ['searching'] },

  // 04-bfs
  'bfs-graph': { phase: '04-bfs', order: 1, tags: ['graph'] },
  'grid-bfs': { phase: '04-bfs', order: 2, tags: ['graph'] },
  'level-order': { phase: '04-bfs', order: 3, tags: ['tree'] },
  'multi-source-bfs': { phase: '04-bfs', order: 4, tags: ['graph'] },

  // 05-dfs
  'dfs-graph': { phase: '05-dfs', order: 1, tags: ['graph'] },
  'number-of-islands': { phase: '05-dfs', order: 2, tags: ['graph'] },
  'tree-traversals': { phase: '05-dfs', order: 3, tags: ['tree'] },
  'tree-preorder': { phase: '05-dfs', order: 4, tags: ['tree'] },
  'path-sum': { phase: '05-dfs', order: 5, tags: ['tree'] },
  'cycle-detection-graph': { phase: '05-dfs', order: 6, tags: ['graph'] },

  // 06-backtracking
  'subsets': { phase: '06-backtracking', order: 1, tags: [] },
  'permutations': { phase: '06-backtracking', order: 2, tags: [] },
  'combinations': { phase: '06-backtracking', order: 3, tags: [] },
  'n-queens': { phase: '06-backtracking', order: 4, tags: [] },
  'generate-parens': { phase: '06-backtracking', order: 5, tags: [] },
  'word-search': { phase: '06-backtracking', order: 6, tags: [] },

  // 07-heap
  'top-k': { phase: '07-heap', order: 1, tags: [] },
  'merge-k-sorted': { phase: '07-heap', order: 2, tags: ['sorting'] },
  'median-of-stream': { phase: '07-heap', order: 3, tags: [] },
  'k-closest-points': { phase: '07-heap', order: 4, tags: [] },
  'task-scheduler': { phase: '07-heap', order: 5, tags: ['greedy'] },

  // 08-graphs
  'topo-sort': { phase: '08-graphs', order: 1, tags: ['graph'] },
  // 'dijkstra' is skipped here — sysviz has a native module.
  'bellman-ford': { phase: '08-graphs', order: 3, tags: ['graph'] },
  'floyd-warshall': { phase: '08-graphs', order: 4, tags: ['graph'] },
  'union-find': { phase: '08-graphs', order: 5, tags: ['graph'] },
  'kruskal': { phase: '08-graphs', order: 6, tags: ['graph'] },
  'prim': { phase: '08-graphs', order: 7, tags: ['graph'] },
  'tarjan-scc': { phase: '08-graphs', order: 8, tags: ['graph'] },

  // 09-dp
  'fibonacci-dp': { phase: '09-dp', order: 1, tags: ['dp'] },
  'house-robber': { phase: '09-dp', order: 2, tags: ['dp'] },
  'climbing-stairs': { phase: '09-dp', order: 3, tags: ['dp'] },
  'coin-change': { phase: '09-dp', order: 4, tags: ['dp'] },
  'lis': { phase: '09-dp', order: 5, tags: ['dp'] },
  'lcs': { phase: '09-dp', order: 6, tags: ['dp', 'string'] },
  'edit-distance': { phase: '09-dp', order: 7, tags: ['dp', 'string'] },
  'knapsack-01': { phase: '09-dp', order: 8, tags: ['dp'] },
  'knapsack-unbounded': { phase: '09-dp', order: 9, tags: ['dp'] },
  'word-break': { phase: '09-dp', order: 10, tags: ['dp', 'string'] },
  'palindrome-partitioning': { phase: '09-dp', order: 11, tags: ['dp', 'string'] },

  // 10-greedy
  'activity-selection': { phase: '10-greedy', order: 1, tags: ['greedy'] },
  'jump-game': { phase: '10-greedy', order: 2, tags: ['greedy'] },
  'gas-station': { phase: '10-greedy', order: 3, tags: ['greedy'] },
  'huffman': { phase: '10-greedy', order: 4, tags: ['greedy'] },
  'intervals': { phase: '10-greedy', order: 5, tags: ['greedy'] },

  // 11-trie
  'trie-insert': { phase: '11-trie', order: 1, tags: ['tree', 'string'] },
  'trie-search': { phase: '11-trie', order: 2, tags: ['tree', 'string'] },
  'word-dictionary': { phase: '11-trie', order: 3, tags: ['tree', 'string'] },
  'word-search-ii': { phase: '11-trie', order: 4, tags: ['tree', 'string'] },
  'autocomplete': { phase: '11-trie', order: 5, tags: ['tree', 'string'] },

  // 12-bit-manipulation
  'single-number-xor': { phase: '12-bit-manipulation', order: 1, tags: [] },
  'counting-bits': { phase: '12-bit-manipulation', order: 2, tags: [] },
  'power-of-two': { phase: '12-bit-manipulation', order: 3, tags: [] },
  'bitmask-tsp': { phase: '12-bit-manipulation', order: 4, tags: ['dp'] },

  // 13-sorting
  'bubble-sort': { phase: '13-sorting', order: 1, tags: ['sorting'] },
  'insertion-sort': { phase: '13-sorting', order: 2, tags: ['sorting'] },
  'selection-sort': { phase: '13-sorting', order: 3, tags: ['sorting'] },
  'merge-sort': { phase: '13-sorting', order: 4, tags: ['sorting'] },
  'quick-sort': { phase: '13-sorting', order: 5, tags: ['sorting'] },
  'heap-sort': { phase: '13-sorting', order: 6, tags: ['sorting'] },
  'counting-sort': { phase: '13-sorting', order: 7, tags: ['sorting'] },
  'radix-sort': { phase: '13-sorting', order: 8, tags: ['sorting'] },

  // 14-linked-list
  'reverse-linked-list': { phase: '14-linked-list', order: 1, tags: ['linked-list'] },
  'floyd-cycle': { phase: '14-linked-list', order: 2, tags: ['linked-list'] },
  'merge-two-sorted-ll': { phase: '14-linked-list', order: 3, tags: ['linked-list', 'sorting'] },
  'remove-nth-end': { phase: '14-linked-list', order: 4, tags: ['linked-list'] },
  'lru-cache': { phase: '14-linked-list', order: 5, tags: ['linked-list', 'caching'] },

  // 15-stack-monotonic
  'valid-parens': { phase: '15-stack-monotonic', order: 1, tags: ['stack-queue'] },
  'next-greater': { phase: '15-stack-monotonic', order: 2, tags: ['stack-queue'] },
  'daily-temperatures': { phase: '15-stack-monotonic', order: 3, tags: ['stack-queue'] },
  'largest-rectangle': { phase: '15-stack-monotonic', order: 4, tags: ['stack-queue'] },
};

// Extract every register("...", { title: "...", caption: "..." }) call.
// The engine destructures `register` from window.DSA, so it's a bare call.
// We exclude `DSA.register(...)` in dsa-viz.js's header docstring by
// anchoring to a non-dot character (or start-of-line whitespace).
const RE = /(?<![.\w])register\(\s*["']([^"']+)["']\s*,\s*\{\s*title:\s*["']([^"']+)["'][\s\S]*?caption:\s*["']([^"']*)["']/g;

function escapeForTs(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function buildMeta({ id, title, caption, phase, order, tags }) {
  const phaseLine = phase ? `  phase: '${phase}',\n` : '';
  const orderLine = order != null ? `  order: ${order},\n` : '';
  const tagsLine = `  tags: [${tags.map((t) => `'${t}'`).join(', ')}],\n`;
  return `import type { AnimMeta } from '~/lib/anim/types';

const meta: AnimMeta = {
  id: '${id}',
  title: '${escapeForTs(title)}',
  caption: '${escapeForTs(caption)}',
${tagsLine}  pillar: 'dsa',
${phaseLine}${orderLine}  premium: false,
};

export default meta;
`;
}

function buildIndex({ id }) {
  return `import type { AnimModule } from '~/lib/anim/types';
import { mountDsa } from '~/lib/anim/dsa-bridge';
import meta from './meta';

const mod: AnimModule = {
  ...meta,
  mount(host) {
    return mountDsa(host, '${id}');
  },
};

export default mod;
`;
}

function main() {
  const files = fs
    .readdirSync(ENGINE_DIR)
    .filter((f) => f.endsWith('.js'))
    .map((f) => path.join(ENGINE_DIR, f));

  const seen = new Map();
  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    for (const m of src.matchAll(RE)) {
      const id = m[1];
      if (seen.has(id)) continue;
      seen.set(id, { id, title: m[2], caption: m[3] });
    }
  }

  let created = 0;
  let skipped = 0;
  const skippedIds = [];
  const created_ids = [];

  for (const reg of seen.values()) {
    const dir = path.join(ANIMS_DIR, reg.id);
    if (fs.existsSync(dir)) {
      skipped++;
      skippedIds.push(reg.id);
      continue;
    }
    fs.mkdirSync(dir, { recursive: true });
    const m = ALGO_META[reg.id] || { tags: [] };
    fs.writeFileSync(
      path.join(dir, 'meta.ts'),
      buildMeta({
        id: reg.id,
        title: reg.title,
        caption: reg.caption,
        phase: m.phase,
        order: m.order,
        tags: m.tags || [],
      }),
    );
    fs.writeFileSync(path.join(dir, 'index.ts'), buildIndex({ id: reg.id }));
    created++;
    created_ids.push(reg.id);
  }

  console.log(`Found ${seen.size} algorithm registrations`);
  console.log(`Created ${created} new anim folders`);
  console.log(`Skipped ${skipped} (already exist): ${skippedIds.join(', ')}`);
  if (created_ids.length) {
    console.log(`\nNew anim ids:\n  ${created_ids.join('\n  ')}`);
  }
}

main();
