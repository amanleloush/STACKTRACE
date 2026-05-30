#!/usr/bin/env node
/**
 * For each DSA cheatsheet MDX in src/content/dsa/<phase>/<phase>-cheatsheet.mdx,
 * append a `## Run the animations` section listing one `<Anim id="X" />`
 * per anim whose meta.ts declares phase === <phase>.
 *
 * Cheatsheets are summary cards — they don't get a single paired anim like
 * algorithm notes do, so we surface every anim in the pattern as a
 * step-through playground at the bottom.
 *
 * Idempotent: skips files that already have the section heading.
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ANIMS_ROOT = path.join(ROOT, 'src/anims');
const DSA_ROOT = path.join(ROOT, 'src/content/dsa');

// Build phase -> [{id, title, order}] map by scanning meta.ts files.
function readAnimMeta(dir) {
  const text = fs.readFileSync(path.join(ANIMS_ROOT, dir, 'meta.ts'), 'utf8');
  const id = (text.match(/id:\s*['"]([^'"]+)['"]/) || [])[1] || dir;
  const title = (text.match(/title:\s*['"]([^'"]+)['"]/) || [])[1] || dir;
  const phase = (text.match(/phase:\s*['"]([^'"]+)['"]/) || [])[1] || null;
  const order = parseInt((text.match(/order:\s*([0-9]+)/) || [])[1] || '99', 10);
  return { id, title, phase, order };
}

function listAnimsByPhase() {
  const byPhase = new Map();
  for (const dir of fs.readdirSync(ANIMS_ROOT)) {
    const stat = fs.statSync(path.join(ANIMS_ROOT, dir));
    if (!stat.isDirectory()) continue;
    const m = readAnimMeta(dir);
    if (!m.phase) continue;
    if (!byPhase.has(m.phase)) byPhase.set(m.phase, []);
    byPhase.get(m.phase).push(m);
  }
  for (const arr of byPhase.values()) {
    arr.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  }
  return byPhase;
}

function findCheatsheet(phase) {
  const phaseDir = path.join(DSA_ROOT, phase);
  if (!fs.existsSync(phaseDir)) return null;
  // Convention: <phase-tag>-cheatsheet.mdx (e.g. 04-bfs → bfs-cheatsheet.mdx).
  // The directory contains exactly one file matching *-cheatsheet.mdx.
  const matches = fs
    .readdirSync(phaseDir)
    .filter((f) => f.endsWith('-cheatsheet.mdx'));
  if (matches.length === 0) return null;
  return path.join(phaseDir, matches[0]);
}

function buildSection(anims) {
  const lines = [
    '## Run the animations',
    '',
    'Every algorithm in this pattern, paired with a step-through visualization.',
    '',
  ];
  for (const a of anims) {
    lines.push(`### ${a.title}`);
    lines.push('');
    lines.push(`<Anim id="${a.id}" />`);
    lines.push('');
  }
  return lines.join('\n');
}

function main() {
  const byPhase = listAnimsByPhase();
  const tally = { updated: 0, 'skipped-idempotent': 0, 'no-cheatsheet': 0, 'no-anims': 0 };
  const log = [];

  for (const phase of [...byPhase.keys()].sort()) {
    const anims = byPhase.get(phase);
    if (!anims || anims.length === 0) {
      tally['no-anims'] += 1;
      continue;
    }
    const cheatsheet = findCheatsheet(phase);
    if (!cheatsheet) {
      tally['no-cheatsheet'] += 1;
      log.push(`no-cheatsheet  phase=${phase}`);
      continue;
    }
    const text = fs.readFileSync(cheatsheet, 'utf8');
    if (/^## Run the animations\b/m.test(text)) {
      tally['skipped-idempotent'] += 1;
      log.push(`skip-existing  ${path.relative(ROOT, cheatsheet)}  (${anims.length} anims)`);
      continue;
    }
    const section = buildSection(anims);
    const newText = text.replace(/\s+$/, '') + '\n\n' + section + '\n';
    fs.writeFileSync(cheatsheet, newText);
    tally.updated += 1;
    log.push(`appended       ${path.relative(ROOT, cheatsheet)}  (${anims.length} anims)`);
  }

  console.log('--- per-cheatsheet outcomes ---');
  for (const line of log) console.log(line);
  console.log('\n--- tally ---');
  for (const [k, v] of Object.entries(tally)) console.log(`${k.padEnd(20)} ${v}`);
}

main();
