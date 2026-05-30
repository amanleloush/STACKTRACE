// Side-effect imports of the brain-detox DSA visualization engine, in
// dependency order. `dsa-viz.js` installs `window.DSA`; every other file
// reads it during its IIFE. The patched `dsa-viz.js` no longer auto-boots —
// sysviz's anim runtime drives mounting via `dsa-bridge.ts`.
//
// This module is client-only — every script touches `window`. Importing it
// from SSR code paths will throw. Always import it from inside an anim
// `mount(host)`, which only runs in the browser.

import './dsa-viz.js';
import './dsa-viz-graphs.js';
import './dsa-viz-heap.js';
import './dsa-viz-misc.js';
import './dsa-viz-search.js';
import './dsa-viz-trie-bit-greedy.js';
import './dsa-viz-upgrades.js';
import './dsa-algorithms.js';
import './dsa-companies.js';
