// Renders every ```mermaid block in src/content with the site's own mermaid
// build, in headless Chromium, and fails if any diagram does not render.
// Runs in CI (GitHub Actions), never on a developer laptop:
//
//   npm i --no-save playwright@1.64.1 && npx playwright install --with-deps chromium
//   node scripts/check-mermaid.mjs
//
// Each diagram is rendered in both site themes ('dark' and 'default') with
// securityLevel 'strict', the same settings as src/lib/mermaid-render.ts.

import { createServer } from 'node:http';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = 'src/content';
const MERMAID_DIST = 'node_modules/mermaid/dist';

function mdxFiles(dir) {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => path.join(dir, f))
    .sort();
}

/** Every mermaid fence with its file and 1-based line. */
function collect() {
  const out = [];
  for (const file of mdxFiles(ROOT)) {
    const lines = readFileSync(file, 'utf8').split('\n');
    for (let i = 0; i < lines.length; i++) {
      const open = /^(\s*)(`{3,})mermaid\s*$/.exec(lines[i]);
      if (!open) continue;
      const fence = open[2];
      const body = [];
      let j = i + 1;
      while (j < lines.length && !new RegExp(`^\\s*${fence}\\s*$`).test(lines[j])) body.push(lines[j++]);
      out.push({ file, line: i + 1, code: body.join('\n') });
      i = j;
    }
  }
  return out;
}

const diagrams = collect();
console.log(`Rendering ${diagrams.length} diagrams from ${ROOT}`);

const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/') {
    res.setHeader('content-type', 'text/html');
    res.end('<!doctype html><meta charset="utf-8"><body></body>');
    return;
  }
  // The ESM build loads its chunks by relative path; serve anything under
  // the dist folder, and nothing outside it.
  const file = path.join(MERMAID_DIST, path.normalize(decodeURIComponent(url.pathname)).replace(/^([/\\]|\.\.)+/, ''));
  if (!path.resolve(file).startsWith(path.resolve(MERMAID_DIST))) {
    res.statusCode = 403;
    res.end();
    return;
  }
  try {
    const body = readFileSync(file);
    res.setHeader('content-type', file.endsWith('.mjs') || file.endsWith('.js') ? 'text/javascript' : 'application/octet-stream');
    res.end(body);
  } catch {
    res.statusCode = 404;
    res.end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`${base}/`);

const failures = await page.evaluate(
  async ({ diagrams, src }) => {
    const { default: mermaid } = await import(src);
    const bad = [];
    for (const theme of ['dark', 'default']) {
      mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme, suppressErrorRendering: true });
      for (let i = 0; i < diagrams.length; i++) {
        try {
          const { svg } = await mermaid.render(`d${theme}${i}`, diagrams[i].code);
          if (/Syntax error|aria-roledescription="error"/.test(svg)) throw new Error('error diagram rendered');
        } catch (e) {
          bad.push({ i, theme, message: String(e?.message ?? e).split('\n').slice(0, 4).join(' | ') });
        }
        document.querySelectorAll('[id^="d"]').forEach((n) => n.remove());
      }
    }
    return bad;
  },
  { diagrams, src: `${base}/mermaid.esm.min.mjs` },
);

await browser.close();
server.close();

const byDiagram = new Map();
for (const f of failures) {
  if (!byDiagram.has(f.i)) byDiagram.set(f.i, f);
}
for (const [i, f] of byDiagram) {
  const d = diagrams[i];
  console.log(`FAIL ${d.file}:${d.line} (${f.theme}): ${f.message}`);
}
console.log(`${diagrams.length - byDiagram.size}/${diagrams.length} diagrams render`);
process.exit(byDiagram.size ? 1 : 0);
