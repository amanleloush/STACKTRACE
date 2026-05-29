import { describe, it, expect } from 'vitest';

describe('SSR safety of the anim runtime', () => {
  it('loads mount.ts in a node environment without throwing', async () => {
    // vitest defaults to environment: 'node', so `typeof document` is
    // undefined here. mount.ts's module-level side effects must be
    // guarded behind that check (see task #4 audit).
    expect(typeof document).toBe('undefined');
    const mod = await import('~/lib/anim/mount');
    expect(typeof mod.mountOne).toBe('function');
    expect(typeof mod.mountAll).toBe('function');
    expect(typeof mod.unmountAll).toBe('function');
  });

  it('loads theme.ts and returns the fallback when window is absent', async () => {
    const { token } = await import('~/lib/anim/theme');
    // Known fallback — see src/lib/anim/theme.ts FALLBACK map.
    expect(token('--anim-node-leader')).toBe('#10b981');
  });

  it('loads a11y.ts and returns false for prefersReducedMotion off-DOM', async () => {
    const { prefersReducedMotion } = await import('~/lib/anim/a11y');
    expect(prefersReducedMotion()).toBe(false);
  });
});
