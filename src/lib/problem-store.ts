// Browser-only store for company-tracker progress (solved + notes).
//
// localStorage is always the first write: `lc:<slug>` → ProgressEntry JSON.
// Every change dispatches a `stacktrace:problem` window event so all
// widgets on the page repaint — keyed by problem slug, so a problem shared
// by several companies updates everywhere at once. A `stacktrace:progress`
// event is fired too, matching NoteCompletion's convention.
//
// When the `stacktrace_signed_in` hint cookie is present the store also
// syncs with /api/v1/problems/progress (one Workers KV doc per user). The
// storage, debounce, batching, keepalive flush and retry mechanics are
// shared with the mistakes notebook: see synced-store.ts.
//
// Notes never leave this module except to our own API. No analytics.

import {
  coerceEntry,
  MAX_BATCH_ENTRIES,
  MAX_NOTES_CHARS,
  type ProgressEntry,
  type ProgressMap,
} from './problem-progress';
import { createSyncedStore, type SyncState } from './synced-store';

const PREFIX = 'lc:';
export const CHANGE_EVENT = 'stacktrace:problem';
export const SYNC_EVENT = 'stacktrace:problem-sync';

export interface ChangeDetail {
  slug: string;
  entry: ProgressEntry | null;
  /** `local` = edited on this page, `sync` = adopted from the server,
   *  `tab` = another tab wrote localStorage. */
  source: 'local' | 'sync' | 'tab';
}

export type { SyncState };

const store = createSyncedStore<ProgressEntry>({
  name: 'lc',
  prefix: PREFIX,
  // The server validates slugs; anything odd is rejected there, as before.
  isValidKey: () => true,
  coerce: coerceEntry,
  api: '/api/v1/problems/progress',
  responseField: 'progress',
  changeEvent: CHANGE_EVENT,
  syncEvent: SYNC_EVENT,
  maxBatchEntries: MAX_BATCH_ENTRIES,
  onEmit: (d) =>
    window.dispatchEvent(
      new CustomEvent('stacktrace:progress', {
        detail: { key: PREFIX + d.key, value: d.entry?.solved ?? false },
      }),
    ),
});

export function readEntry(slug: string): ProgressEntry | null {
  return store.readEntry(slug);
}

export function readAll(): ProgressMap {
  return store.readAll();
}

export function onChange(fn: (d: ChangeDetail) => void): void {
  store.onChange((d) => fn({ slug: d.key, entry: d.entry, source: d.source }));
}

/** Apply a local edit, persist it, notify listeners, and queue a server push. */
export function updateEntry(
  slug: string,
  patch: Partial<Pick<ProgressEntry, 'solved' | 'notes'>>,
): ProgressEntry {
  const prev = readEntry(slug) ?? { solved: false, notes: '', updatedAt: 0 };
  const next: ProgressEntry = {
    solved: patch.solved ?? prev.solved,
    notes: (patch.notes ?? prev.notes).slice(0, MAX_NOTES_CHARS),
    // Strictly increasing per slug, even if the clock steps backwards.
    updatedAt: Math.max(Date.now(), prev.updatedAt + 1),
  };
  store.write(slug, next);
  return next;
}

export function isSignedIn(): boolean {
  return store.isSignedIn();
}

export function getSyncState(): SyncState {
  return store.getSyncState();
}

export function onSyncState(fn: (s: SyncState) => void): void {
  store.onSyncState(fn);
}

/**
 * One-time page setup: cross-tab change relay, and (when signed in) the
 * initial pull/merge/push. Safe to call from every widget's script.
 */
export function initProblemStore(): void {
  store.init();
}
