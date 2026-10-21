// Last-write-wins merges shared by every "localStorage first + KV sync"
// feature (company-problem progress, the mistakes notebook). Entries only
// need an `updatedAt` (unix ms, client clock); everything else is opaque.
//
// Pure and dependency-free, so it ships to the browser as well as the
// Worker.

export interface Timestamped {
  updatedAt: number;
}

export interface BatchApplyResult<E extends Timestamped> {
  /** The stored map after applying every newer incoming entry. */
  next: Record<string, E>;
  /** Keys whose incoming entry was strictly newer and is now stored. */
  applied: string[];
  /** Server copies that were at least as new as the incoming entry. */
  stale: Record<string, E>;
  /** Incoming keys that are new to the doc (count against the cap). */
  added: number;
}

/**
 * Server-side last-write-wins over a batch: an incoming entry replaces the
 * stored one only when its `updatedAt` is strictly newer; otherwise the
 * stored entry is reported back in `stale` so the client can adopt it.
 * Ties are stale (no flip-flopping between devices). Pure — never mutates
 * `stored`.
 */
export function applyLwwBatch<E extends Timestamped>(
  stored: Record<string, E>,
  incoming: Record<string, E>,
): BatchApplyResult<E> {
  const next: Record<string, E> = { ...stored };
  const applied: string[] = [];
  const stale: Record<string, E> = {};
  let added = 0;
  for (const [key, entry] of Object.entries(incoming)) {
    const cur = Object.prototype.hasOwnProperty.call(stored, key) ? stored[key] : undefined;
    if (cur && cur.updatedAt >= entry.updatedAt) {
      stale[key] = cur;
      continue;
    }
    if (!cur) added++;
    next[key] = entry;
    applied.push(key);
  }
  return { next, applied: applied.sort(), stale, added };
}

export interface MergeResult<E extends Timestamped> {
  /** Union of both sides, newest `updatedAt` per key. */
  merged: Record<string, E>;
  /** Keys where the server copy won and must be written locally. */
  pull: string[];
  /** Keys where the local copy is strictly newer and must be PUT. */
  push: string[];
}

/**
 * Client-side last-write-wins merge by `updatedAt`. Ties go to the server
 * (nothing to push, nothing to pull) so two devices that already agree stay
 * quiet.
 */
export function mergeLww<E extends Timestamped>(
  local: Record<string, E>,
  server: Record<string, E>,
): MergeResult<E> {
  const merged: Record<string, E> = {};
  const pull: string[] = [];
  const push: string[] = [];
  const keys = new Set([...Object.keys(local), ...Object.keys(server)]);
  for (const key of keys) {
    const l = local[key];
    const s = server[key];
    if (l && (!s || l.updatedAt > s.updatedAt)) {
      merged[key] = l;
      push.push(key);
    } else if (s) {
      merged[key] = s;
      if (!l || s.updatedAt > l.updatedAt) pull.push(key);
    }
  }
  return { merged, pull: pull.sort(), push: push.sort() };
}
