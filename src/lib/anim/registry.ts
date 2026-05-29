import type { AnimMeta, AnimModule, AnimTag } from './types';

// Eager-glob the lightweight `meta.ts` files. These are cheap (no DOM code,
// no SVG helpers) and shipping them all to the client is fine — the gallery
// needs every meta to render the grid.
const metaModules = import.meta.glob<{ default: AnimMeta }>(
  '/src/anims/*/meta.ts',
  { eager: true },
);

// Lazy-glob the full anim modules. Vite/Astro code-splits each into its own
// chunk; the network only fetches when `getAnimLoader(id)()` is called.
const moduleLoaders = import.meta.glob<{ default: AnimModule }>(
  '/src/anims/*/index.ts',
);

function dirOf(path: string): string {
  const m = path.match(/\/src\/anims\/([^/]+)\//);
  if (!m) throw new Error(`Cannot extract anim directory from ${path}`);
  return m[1]!;
}

const metaByDir = new Map<string, AnimMeta>();
for (const [path, mod] of Object.entries(metaModules)) {
  const dir = dirOf(path);
  if (mod.default.id !== dir) {
    throw new Error(
      `Anim meta mismatch in ${path}: meta.id="${mod.default.id}" but directory is "${dir}". They must match.`,
    );
  }
  metaByDir.set(dir, mod.default);
}

const loaderByDir = new Map<string, () => Promise<AnimModule>>();
for (const [path, loader] of Object.entries(moduleLoaders)) {
  const dir = dirOf(path);
  loaderByDir.set(dir, async () => (await loader()).default);
}

// Every loader must have a matching meta — surface drift at boot, not in prod.
for (const dir of loaderByDir.keys()) {
  if (!metaByDir.has(dir)) {
    throw new Error(`Anim "${dir}" has index.ts but no meta.ts`);
  }
}
for (const dir of metaByDir.keys()) {
  if (!loaderByDir.has(dir)) {
    throw new Error(`Anim "${dir}" has meta.ts but no index.ts`);
  }
}

export interface AnimFilter {
  pillar?: 'systems' | 'dsa';
  phase?: string;
  tag?: AnimTag;
}

export function getMeta(id: string): AnimMeta | undefined {
  return metaByDir.get(id);
}

export function listAnimMetas(filter?: AnimFilter): AnimMeta[] {
  let arr = [...metaByDir.values()];
  if (filter?.pillar) arr = arr.filter((m) => m.pillar === filter.pillar);
  if (filter?.phase) arr = arr.filter((m) => m.phase === filter.phase);
  if (filter?.tag) arr = arr.filter((m) => m.tags.includes(filter.tag!));
  return arr.sort((a, b) => {
    if (a.order != null && b.order != null && a.phase === b.phase) {
      return a.order - b.order;
    }
    if (a.phase && b.phase && a.phase !== b.phase) {
      return a.phase.localeCompare(b.phase);
    }
    return a.title.localeCompare(b.title);
  });
}

export function getAnimLoader(id: string): (() => Promise<AnimModule>) | undefined {
  return loaderByDir.get(id);
}
