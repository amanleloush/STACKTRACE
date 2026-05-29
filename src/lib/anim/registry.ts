import type { AnimModule } from './types';

// Auto-discover every animation under src/anims/<id>/index.ts.
// No manual registration required — drop a file in, it appears in the gallery.
const modules = import.meta.glob<{ default: AnimModule }>('/src/anims/*/index.ts', {
  eager: true,
});

const entries: [string, AnimModule][] = Object.values(modules).map((m) => [
  m.default.id,
  m.default,
]);

export const registry = new Map<string, AnimModule>(entries);

export function getAnim(id: string): AnimModule | undefined {
  return registry.get(id);
}

export function listAnims(): AnimModule[] {
  return [...registry.values()].sort((a, b) => a.title.localeCompare(b.title));
}
