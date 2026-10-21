// Browser-only store for the daily review queue (/review/).
//
// localStorage first: `rv:<cardId>` → CardState JSON, `rv:settings` →
// ReviewSettings JSON. Every change dispatches a `stacktrace:review` window
// event. Signed-in users (the `stacktrace_signed_in` hint cookie) also sync
// with /api/v1/review — debounce, batching, keepalive flush and retries are
// the shared synced-store.ts ones, merged per card by `updatedAt`.

import {
  coerceReviewEntry,
  isValidReviewKey,
  makeSettings,
  MAX_BATCH_ENTRIES,
  MAX_ENTRIES_PER_USER,
  review,
  settingsOf,
  SETTINGS_KEY,
  type CardState,
  type Rating,
  type ReviewEntry,
  type ReviewMap,
  type ReviewSettings,
} from './review-schedule';
import { createSyncedStore, type ChangeDetail, type SyncState } from './synced-store';

export const CHANGE_EVENT = 'stacktrace:review';
export const SYNC_EVENT = 'stacktrace:review-sync';

export type { SyncState };

const store = createSyncedStore<ReviewEntry>({
  name: 'rv',
  prefix: 'rv:',
  isValidKey: isValidReviewKey,
  coerce: coerceReviewEntry,
  api: '/api/v1/review',
  responseField: 'review',
  changeEvent: CHANGE_EVENT,
  syncEvent: SYNC_EVENT,
  maxBatchEntries: MAX_BATCH_ENTRIES,
});

export const initReviewStore = (): void => store.init();
export const readAllReview = (): ReviewMap => store.readAll();
export const onReviewChange = (fn: (d: ChangeDetail<ReviewEntry>) => void): void => store.onChange(fn);
export const onReviewSync = (fn: (s: SyncState) => void): void => store.onSyncState(fn);
export const isSignedIn = (): boolean => store.isSignedIn();

export function readSettings(): ReviewSettings {
  const s = store.readEntry(SETTINGS_KEY);
  return settingsOf(s ? { [SETTINGS_KEY]: s } : {});
}

export function saveSettings(patch: { dailyCap?: number; phases?: string[] }): ReviewSettings {
  const prev = store.readEntry(SETTINGS_KEY);
  const next = makeSettings(prev?.kind === 'settings' ? prev : null, patch);
  store.write(SETTINGS_KEY, next);
  return next;
}

/**
 * Rate one card. `from` is the state the card was scheduled from (null for
 * a new card, or a graduated mistake that was missed again). Returns the new
 * state, or null when the account is at the card cap.
 */
export function rateCard(id: string, from: CardState | null, rating: Rating, isMistake: boolean): CardState | null {
  const stored = store.readEntry(id);
  if (!stored && Object.keys(store.readAll()).length >= MAX_ENTRIES_PER_USER) return null;
  const next = review(from, rating, Date.now(), isMistake);
  // Stay strictly newer than whatever is stored, even when scheduling
  // from a reset state, so last-write-wins keeps this review.
  if (stored) next.updatedAt = Math.max(next.updatedAt, stored.updatedAt + 1);
  store.write(id, next);
  return next;
}
