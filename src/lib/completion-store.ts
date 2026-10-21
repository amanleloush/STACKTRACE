// Browser-only store for "Mark as completed" on notes and DSA pages.
//
// localStorage first: `nc:<pillar>:<slug>` → CompletionEntry JSON. Signed-in
// users (the `stacktrace_signed_in` hint cookie) also sync with
// /api/v1/completion — debounce, batching, keepalive flush and retries are
// shared with the company tracker and the mistakes notebook (synced-store.ts).
//
// Every change (local, another tab, or adopted from the server) fires both
// `stacktrace:completion` and the long-standing `stacktrace:progress`
// event (`{ key, value }`), so the roadmap keeps repainting as before.
//
// Before this store existed, completion lived in one localStorage array,
// `stacktrace:completed`. initCompletionStore() copies any of those keys
// the store doesn't know yet (see migrateLegacy) — idempotent, so it runs
// on every page load. The array is left in place, read-only, so nothing is
// lost if an older build is ever served again.

import {
  coerceCompletion,
  doneKeys,
  isValidCompletionKey,
  LEGACY_KEY,
  markEntry,
  MAX_BATCH_ENTRIES,
  migrateLegacy,
  type CompletionEntry,
  type CompletionMap,
} from './completion';
import { createSyncedStore, type ChangeDetail, type SyncState } from './synced-store';

export const CHANGE_EVENT = 'stacktrace:completion';
export const SYNC_EVENT = 'stacktrace:completion-sync';

export type { SyncState, ChangeDetail };

const store = createSyncedStore<CompletionEntry>({
  name: 'nc',
  prefix: 'nc:',
  isValidKey: isValidCompletionKey,
  coerce: coerceCompletion,
  api: '/api/v1/completion',
  responseField: 'completion',
  changeEvent: CHANGE_EVENT,
  syncEvent: SYNC_EVENT,
  maxBatchEntries: MAX_BATCH_ENTRIES,
  onEmit: (d) =>
    window.dispatchEvent(
      new CustomEvent('stacktrace:progress', { detail: { key: d.key, value: d.entry?.done ?? false } }),
    ),
});

function migrate(): void {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(LEGACY_KEY);
  } catch {
    return; // storage blocked: there is nothing to migrate
  }
  const all = store.readAll();
  const found = migrateLegacy(raw, (k) => Object.prototype.hasOwnProperty.call(all, k));
  for (const [key, entry] of Object.entries(found)) store.write(key, entry);
}

/**
 * One-time page setup: legacy migration, cross-tab relay and (signed in)
 * the initial pull/merge/push. Safe to call from every widget's script.
 */
export function initCompletionStore(): void {
  const G = window as unknown as { __st_nc_migrated?: boolean };
  if (!G.__st_nc_migrated) {
    G.__st_nc_migrated = true;
    migrate();
  }
  store.init();
}

export const readCompletion = (key: string): CompletionEntry | null => store.readEntry(key);
export const readAllCompletion = (): CompletionMap => store.readAll();
export const completedKeys = (): Set<string> => doneKeys(store.readAll());
export const isCompleted = (key: string): boolean => store.readEntry(key)?.done ?? false;
export const onCompletionChange = (fn: (d: ChangeDetail<CompletionEntry>) => void): void => store.onChange(fn);
export const onCompletionSync = (fn: (s: SyncState) => void): void => store.onSyncState(fn);
export const isSignedIn = (): boolean => store.isSignedIn();

/** Mark (or un-mark) one item; un-marking writes a tombstone. */
export function setCompleted(key: string, done: boolean): CompletionEntry | null {
  if (!isValidCompletionKey(key)) return null;
  const next = markEntry(store.readEntry(key), done);
  store.write(key, next);
  return next;
}
