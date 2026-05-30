#!/usr/bin/env node
/**
 * One-shot rename: every user-facing "sysviz" string in source files
 * becomes "stacktrace". Repo paths, package.json name, internal
 * module names are NOT touched — only what a reader sees.
 *
 * Idempotent: re-running on a clean tree is a no-op.
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// File-by-file replacement specs. Each entry: { file, replacements: [[from, to], ...] }.
// Replacements are exact-string matches via String#replaceAll — the literal
// surrounding text (quotes, punctuation) IS part of the pattern so we never
// accidentally rename internal identifiers.
const SPECS = [
  // Page titles (BaseLayout title prop)
  { file: 'src/pages/about.astro',                replacements: [['About — sysviz', 'About — stacktrace'], ['Working title: <strong>sysviz</strong> (the final name will be locked later).', 'A learn-by-watching site for system design and DSA. Every concept ships with a step-through visualization.']] },
  { file: 'src/pages/roadmap.astro',              replacements: [['Roadmap — sysviz', 'Roadmap — stacktrace']] },
  { file: 'src/pages/pricing.astro',              replacements: [['Pricing — sysviz', 'Pricing — stacktrace'], ["name: 'sysviz'", "name: 'stacktrace'"]] },
  { file: 'src/pages/index.astro',                replacements: [['sysviz — interactive system design & DSA', 'stacktrace — interactive system design & DSA']] },
  { file: 'src/pages/login.astro',                replacements: [['Sign in — sysviz', 'Sign in — stacktrace']] },
  { file: 'src/pages/learn/dsa/[slug].astro',     replacements: [['${entry.data.title} — sysviz', '${entry.data.title} — stacktrace']] },
  { file: 'src/pages/learn/notes/[slug].astro',   replacements: [['${entry.data.title} — sysviz', '${entry.data.title} — stacktrace']] },
  { file: 'src/pages/dsa/[phase].astro',          replacements: [['${phase.title} · DSA — sysviz', '${phase.title} · DSA — stacktrace']] },
  { file: 'src/pages/dsa/index.astro',            replacements: [['DSA · Interview Prep — sysviz', 'DSA · Interview Prep — stacktrace']] },
  { file: 'src/pages/admin/index.astro',          replacements: [['Admin — sysviz', 'Admin — stacktrace']] },
  { file: 'src/pages/notes/index.astro',          replacements: [['Notes — sysviz', 'Notes — stacktrace']] },
  { file: 'src/pages/account/index.astro',        replacements: [['Account — sysviz', 'Account — stacktrace']] },
  { file: 'src/pages/account/api-keys.astro',     replacements: [['API keys — sysviz', 'API keys — stacktrace']] },
  { file: 'src/pages/animations/index.astro',     replacements: [['Animations — sysviz', 'Animations — stacktrace']] },
  { file: 'src/pages/animations/[id].astro',      replacements: [['${anim.title} — sysviz', '${anim.title} — stacktrace']] },
  { file: 'package.json',                         replacements: [['"description": "Interactive system-design and DSA visualizations. Working title — rename via SITE_SLUG."', '"description": "stacktrace — interactive system design & DSA visualizations. Every concept paired with a step-through animation."']] },
];

let touched = 0;
let skipped = 0;
let missing = 0;
const log = [];

for (const spec of SPECS) {
  const abs = path.join(ROOT, spec.file);
  if (!fs.existsSync(abs)) {
    missing++;
    log.push(`MISSING ${spec.file}`);
    continue;
  }
  const before = fs.readFileSync(abs, 'utf8');
  let after = before;
  let appliedCount = 0;
  for (const [from, to] of spec.replacements) {
    const next = after.replaceAll(from, to);
    if (next !== after) appliedCount++;
    after = next;
  }
  if (after === before) {
    skipped++;
    log.push(`skip    ${spec.file}  (already renamed or pattern not found)`);
    continue;
  }
  fs.writeFileSync(abs, after);
  touched++;
  log.push(`renamed ${spec.file}  (${appliedCount}/${spec.replacements.length} patterns)`);
}

console.log('--- per-file outcomes ---');
for (const line of log) console.log(line);
console.log(`\n--- tally ---\ntouched ${touched}\nskipped ${skipped}\nmissing ${missing}`);
