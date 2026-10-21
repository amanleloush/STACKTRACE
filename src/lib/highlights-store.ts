// Browser-only store for highlights and per-page "My notes".
//
// localStorage first: `hl:h:<id>` / `hl:p:<pillar>:<slug>` → entry JSON.
// Signed-in users (the `stacktrace_signed_in` hint cookie) also sync with
// /api/v1/highlights — debounce, batching, keepalive flush and retries are
// shared with the company tracker, the mistakes notebook and completion
// (synced-store.ts). Every change (local, another tab, or adopted from the
// server) fires `stacktrace:highlights` on window.
//
// Removing a highlight writes a tombstone (see highlights.ts), never a
// delete, so the removal syncs.

import {
  countLive,
  highlightKey,
  isValidHlKey,
  isValidPage,
  coerceHlEntry,
  liveHighlights,
  MAX_BATCH_ENTRIES,
  MAX_HIGHLIGHTS,
  MAX_NOTE_CHARS,
  MAX_PAGE_NOTE_CHARS,
  newHighlightId,
  nextStamp,
  pageNoteKey,
  tombstone,
  type HighlightEntry,
  type HlColor,
  type HlEntry,
  type HlMap,
} from './highlights';
import type { TextQuote } from './highlights-anchor';
import { createSyncedStore, type ChangeDetail, type SyncState } from './synced-store';

export const CHANGE_EVENT = 'stacktrace:highlights';
export const SYNC_EVENT = 'stacktrace:highlights-sync';

export type { SyncState, ChangeDetail };

const store = createSyncedStore<HlEntry>({
  name: 'hl',
  prefix: 'hl:',
  isValidKey: isValidHlKey,
  coerce: coerceHlEntry,
  api: '/api/v1/highlights',
  responseField: 'highlights',
  changeEvent: CHANGE_EVENT,
  syncEvent: SYNC_EVENT,
  maxBatchEntries: MAX_BATCH_ENTRIES,
});

export const initHighlightsStore = (): void => store.init();
export const readAllHighlights = (): HlMap => store.readAll();
export const onHighlightsChange = (fn: (d: ChangeDetail<HlEntry>) => void): void => store.onChange(fn);
export const onHighlightsSync = (fn: (s: SyncState) => void): void => store.onSyncState(fn);
export const isSignedIn = (): boolean => store.isSignedIn();

/** One highlight, if it exists and is live. */
export function readHighlight(id: string): HighlightEntry | null {
  const e = store.readEntry(highlightKey(id));
  return e && e.kind === 'hl' && !e.deleted ? e : null;
}

/** Live highlights on one page. */
export function pageHighlights(page: string): Array<HighlightEntry & { id: string }> {
  return liveHighlights(store.readAll()).filter((h) => h.page === page);
}

export type AddResult = { ok: true; id: string; entry: HighlightEntry } | { ok: false; reason: 'limit' | 'invalid' };

export function addHighlight(page: string, quote: TextQuote, color: HlColor, note = ''): AddResult {
  if (!isValidPage(page)) return { ok: false, reason: 'invalid' };
  if (countLive(store.readAll()) >= MAX_HIGHLIGHTS) return { ok: false, reason: 'limit' };
  const id = newHighlightId(() => {
    // Prefer the CSPRNG; ids only need to be unique, not secret.
    try {
      const a = new Uint32Array(1);
      crypto.getRandomValues(a);
      return a[0]! / 2 ** 32;
    } catch {
      return Math.random();
    }
  });
  const now = Date.now();
  const entry: HighlightEntry = {
    kind: 'hl',
    page,
    color,
    exact: quote.exact,
    prefix: quote.prefix,
    suffix: quote.suffix,
    heading: quote.heading,
    pos: quote.pos,
    note: note.slice(0, MAX_NOTE_CHARS),
    detached: false,
    deleted: false,
    createdAt: now,
    updatedAt: now,
  };
  store.write(highlightKey(id), entry);
  return { ok: true, id, entry };
}

/** Change a live highlight's colour, note or detached flag. No-op if nothing changes. */
export function updateHighlight(
  id: string,
  patch: Partial<Pick<HighlightEntry, 'color' | 'note' | 'detached'>>,
): HighlightEntry | null {
  const prev = readHighlight(id);
  if (!prev) return null;
  const next: HighlightEntry = {
    ...prev,
    ...patch,
    note: (patch.note ?? prev.note).slice(0, MAX_NOTE_CHARS),
  };
  if (next.color === prev.color && next.note === prev.note && next.detached === prev.detached) return prev;
  next.updatedAt = nextStamp(prev);
  store.write(highlightKey(id), next);
  return next;
}

export function removeHighlight(id: string): void {
  const prev = readHighlight(id);
  if (prev) store.write(highlightKey(id), tombstone(prev));
}

export function readPageNote(page: string): string {
  const e = store.readEntry(pageNoteKey(page));
  return e && e.kind === 'page' ? e.text : '';
}

/** Save a page's "My notes" (truncated to the cap). No-op if unchanged. */
export function setPageNote(page: string, text: string): void {
  if (!isValidPage(page)) return;
  const key = pageNoteKey(page);
  const prev = store.readEntry(key);
  const value = text.slice(0, MAX_PAGE_NOTE_CHARS);
  if (prev?.kind === 'page' && prev.text === value) return;
  if (!prev && value === '') return;
  store.write(key, { kind: 'page', page, text: value, updatedAt: nextStamp(prev) });
}
