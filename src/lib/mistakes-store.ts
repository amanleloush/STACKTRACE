// Browser-only store for the mistakes notebook.
//
// localStorage first: `qm:<mcqId>` → MistakeEntry JSON. Every change
// dispatches a `stacktrace:mistakes` window event. Signed-in users (the
// `stacktrace_signed_in` hint cookie) also sync with /api/v1/quiz/mistakes
// — debounce, batching, keepalive flush and retries are the same as the
// company tracker's (synced-store.ts).
//
// "Clear resolved" can't delete entries: a resolved entry is the tombstone
// that stops another device's older "open" copy from coming back. Instead
// this device remembers a watermark (`qm-cleared-at`) and the page hides
// resolved entries last changed at or before it. Missing the question
// again later bumps `updatedAt` past the watermark, so it shows again.

import {
  coerceMistake,
  isValidMcqId,
  MAX_BATCH_ENTRIES,
  MAX_ENTRIES_PER_USER,
  recordRight,
  recordWrong,
  type MistakeEntry,
  type MistakeMap,
} from './mistakes';
import { createSyncedStore, type ChangeDetail, type SyncState } from './synced-store';

export const CHANGE_EVENT = 'stacktrace:mistakes';
export const SYNC_EVENT = 'stacktrace:mistakes-sync';
const CLEARED_KEY = 'qm-cleared-at';

export type { SyncState };

const store = createSyncedStore<MistakeEntry>({
  name: 'qm',
  prefix: 'qm:',
  isValidKey: isValidMcqId,
  coerce: coerceMistake,
  api: '/api/v1/quiz/mistakes',
  responseField: 'mistakes',
  changeEvent: CHANGE_EVENT,
  syncEvent: SYNC_EVENT,
  maxBatchEntries: MAX_BATCH_ENTRIES,
});

export const initMistakesStore = (): void => store.init();
export const readMistake = (id: string): MistakeEntry | null => store.readEntry(id);
export const readAllMistakes = (): MistakeMap => store.readAll();
export const onMistakesChange = (fn: (d: ChangeDetail<MistakeEntry>) => void): void => store.onChange(fn);
export const onMistakesSync = (fn: (s: SyncState) => void): void => store.onSyncState(fn);
export const isSignedIn = (): boolean => store.isSignedIn();

/** What an answer did to the notebook, for the line under the verdict. */
export type AnswerOutcome = 'saved' | 'resolved' | 'limit' | null;

/**
 * Record one answer to a quiz question. Wrong → open + count the miss;
 * right on an open question → resolved; right otherwise → nothing.
 */
export function recordAnswer(id: string, noteSlug: string, picked: number, correct: boolean): AnswerOutcome {
  if (!isValidMcqId(id)) return null;
  const prev = store.readEntry(id);
  if (correct) {
    const next = recordRight(prev);
    if (!next) return null;
    store.write(id, next);
    return 'resolved';
  }
  if (!prev && Object.keys(store.readAll()).length >= MAX_ENTRIES_PER_USER) return 'limit';
  store.write(id, recordWrong(prev, picked, noteSlug));
  return 'saved';
}

/** Mark a question resolved (e.g. it was edited and can't be re-answered). */
export function resolveMistake(id: string): void {
  const next = recordRight(store.readEntry(id));
  if (next) store.write(id, next);
}

let memoryClearedAt = 0;

export function getClearedAt(): number {
  let stored = 0;
  try {
    const n = Number(localStorage.getItem(CLEARED_KEY));
    if (Number.isFinite(n) && n > 0) stored = n;
  } catch {
    /* storage blocked */
  }
  return Math.max(stored, memoryClearedAt);
}

/** Hide every resolved entry changed up to now (this device only). */
export function clearResolved(): void {
  let mark = Date.now();
  for (const e of Object.values(store.readAll())) {
    if (e.status === 'resolved') mark = Math.max(mark, e.updatedAt);
  }
  memoryClearedAt = mark;
  try {
    localStorage.setItem(CLEARED_KEY, String(mark));
  } catch {
    /* storage blocked — the in-memory mark serves this page */
  }
  window.dispatchEvent(
    new CustomEvent<ChangeDetail<MistakeEntry>>(CHANGE_EVENT, { detail: { key: '', entry: null, source: 'local' } }),
  );
}
