import { getAnim } from './registry';
import type { AnimHandle } from './types';

interface MountedAnim {
  id: string;
  host: HTMLElement;
  handle: AnimHandle;
  visible: boolean;
}

const MOUNTED = new WeakMap<HTMLElement, MountedAnim>();
let observer: IntersectionObserver | null = null;

function ensureObserver(): IntersectionObserver {
  if (observer) return observer;
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const mounted = MOUNTED.get(entry.target as HTMLElement);
        if (!mounted) continue;
        if (entry.isIntersecting && !mounted.visible) {
          mounted.visible = true;
          mounted.handle.resume();
        } else if (!entry.isIntersecting && mounted.visible) {
          mounted.visible = false;
          mounted.handle.pause();
        }
      }
    },
    { rootMargin: '200px 0px', threshold: 0.01 },
  );
  return observer;
}

/**
 * Mount one animation host. Safe to call multiple times — re-mount is a no-op
 * if the same id is already mounted on the same node.
 */
export function mountOne(host: HTMLElement): void {
  const id = host.dataset['anim'];
  if (!id) return;
  const existing = MOUNTED.get(host);
  if (existing && existing.id === id) return;
  if (existing) existing.handle.destroy();

  const mod = getAnim(id);
  if (!mod) {
    host.innerHTML = `<div class="anim__caption" style="color:var(--anim-danger)">Unknown animation: ${id}</div>`;
    return;
  }
  const handle = mod.mount(host, readOpts(host));
  const mounted: MountedAnim = { id, host, handle, visible: true };
  MOUNTED.set(host, mounted);
  ensureObserver().observe(host);
}

/** Mount every `[data-anim]` element currently in the DOM. */
export function mountAll(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-anim]').forEach(mountOne);
}

/** Tear down all mounted anims (used on Astro view-transitions). */
export function unmountAll(): void {
  document.querySelectorAll<HTMLElement>('[data-anim]').forEach((host) => {
    const m = MOUNTED.get(host);
    if (m) {
      m.handle.destroy();
      observer?.unobserve(host);
      MOUNTED.delete(host);
    }
  });
}

function readOpts(host: HTMLElement): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key in host.dataset) {
    if (key === 'anim') continue;
    const v = host.dataset[key]!;
    const n = Number(v);
    out[key] = Number.isFinite(n) && v !== '' ? n : v;
  }
  return out;
}

// Boot on initial load + on Astro client-side navigation.
if (typeof document !== 'undefined') {
  const boot = () => mountAll();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
  document.addEventListener('astro:page-load', () => mountAll());
  document.addEventListener('astro:before-swap', () => unmountAll());
}
