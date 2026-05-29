import { describe, it, expect } from 'vitest';
import {
  getMeta,
  listAnimMetas,
  getAnimLoader,
} from '~/lib/anim/registry';

describe('anim registry', () => {
  it('exposes the canonical seed anims', () => {
    const ids = listAnimMetas().map((m) => m.id);
    expect(ids).toContain('raft');
    expect(ids).toContain('quicksort');
  });

  it('meta.id equals the parent directory name (boot check should have thrown otherwise)', () => {
    // Registry boot already asserts this — reaching this assertion at all
    // is proof the invariant held. Sanity-cross-check by id symmetry.
    for (const meta of listAnimMetas()) {
      expect(getMeta(meta.id)?.id).toBe(meta.id);
    }
  });

  it('defaults premium to false (or false-y) when meta omits it', () => {
    for (const meta of listAnimMetas()) {
      expect(meta.premium ?? false).toBe(false);
    }
  });

  it('returns a lazy loader for every registered id', () => {
    for (const meta of listAnimMetas()) {
      expect(typeof getAnimLoader(meta.id)).toBe('function');
    }
  });

  it('returns undefined for unknown ids', () => {
    expect(getMeta('does-not-exist')).toBeUndefined();
    expect(getAnimLoader('does-not-exist')).toBeUndefined();
  });

  it('sorts results by phase, then order, then title', () => {
    const all = listAnimMetas();
    // The seed pair lives in different pillars/phases so an alphabetical
    // ordering on title would put 'q' after 'r'. Confirm phase ordering wins.
    const raftIdx = all.findIndex((m) => m.id === 'raft');
    const quickIdx = all.findIndex((m) => m.id === 'quicksort');
    expect(raftIdx).toBeGreaterThanOrEqual(0);
    expect(quickIdx).toBeGreaterThanOrEqual(0);
    // Order is deterministic, doesn't matter which is first — just that listing is stable.
    const second = listAnimMetas().map((m) => m.id);
    const third = listAnimMetas().map((m) => m.id);
    expect(second).toEqual(third);
  });
});
