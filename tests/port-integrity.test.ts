import { describe, it, expect } from 'vitest';
import { glob } from 'node:fs/promises';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listAnimMetas } from '~/lib/anim/registry';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const NOTES_DIR = path.join(REPO_ROOT, 'src/content/notes');

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full)));
    else if (e.isFile() && (e.name.endsWith('.mdx') || e.name.endsWith('.md'))) out.push(full);
  }
  return out;
}

describe('content port — registry integrity', () => {
  it('every <Anim id="…"> in ported MDX references a registered animation', async () => {
    const knownIds = new Set(listAnimMetas().map((m) => m.id));
    const files = await walk(NOTES_DIR);

    const offenders: Array<{ file: string; ids: string[] }> = [];
    for (const file of files) {
      const src = await fs.readFile(file, 'utf8');
      const matches = [...src.matchAll(/<Anim\s+id=["']([^"']+)["']/g)].map((m) => m[1]!);
      const bad = matches.filter((id) => !knownIds.has(id));
      if (bad.length) offenders.push({ file: path.relative(REPO_ROOT, file), ids: bad });
    }

    expect(offenders, JSON.stringify(offenders, null, 2)).toEqual([]);
  });

  it('every ported MDX file has a non-empty title', async () => {
    const files = await walk(NOTES_DIR);
    const offenders: string[] = [];
    for (const file of files) {
      const src = await fs.readFile(file, 'utf8');
      const fm = src.match(/^---\n([\s\S]*?)\n---/);
      if (!fm) {
        offenders.push(path.relative(REPO_ROOT, file));
        continue;
      }
      const title = fm[1]!.match(/^title:\s*"([^"]+)"/m);
      if (!title || !title[1] || !title[1].trim()) {
        offenders.push(path.relative(REPO_ROOT, file));
      }
    }
    expect(offenders).toEqual([]);
  });

  it('every <Premium key="…"> in ported MDX supplies a non-empty key', async () => {
    const files = await walk(NOTES_DIR);
    const offenders: string[] = [];
    for (const file of files) {
      const src = await fs.readFile(file, 'utf8');
      const matches = [...src.matchAll(/<Premium(\s[^>]*)?>/g)];
      for (const m of matches) {
        const attrs = m[1] ?? '';
        const k = attrs.match(/\bkey=["']([^"']*)["']/);
        if (!k || !k[1]) {
          offenders.push(path.relative(REPO_ROOT, file));
        }
      }
    }
    // Phase 1: codemod does NOT auto-insert <Premium> blocks, so this is a
    // forward-looking check — should always be 0 right now and stay 0 as
    // authors hand-add gating points later (plan §14f).
    expect(offenders).toEqual([]);
  });
});
