// Browser-only store for company-tracker progress (solved + notes).
//
// localStorage is always the first write: `lc:<slug>` → ProgressEntry JSON,
// every access wrapped in try/catch (private mode / quota / disabled
// storage just degrades to in-memory for the page). Every change dispatches
// a `stacktrace:problem` window event so all widgets on the page repaint —
// keyed by problem slug, so a problem shared by several companies updates
// everywhere at once. A `stacktrace:progress` event is fired too, matching
// NoteCompletion's convention.
//
// When the `stacktrace_signed_in` hint cookie is present the store also
// syncs with /api/v1/problems/progress (one Workers KV doc per user):
//  - on page load: GET, merge newest-`updatedAt`-wins with localStorage,
//    and push the local-newer entries in batches;
//  - each edit marks its slug dirty; dirty slugs go up in ONE batch PUT
//    after a ~1.5 s debounce (KV allows ~1 write/sec per key, so batches
//    are also spaced ≥1.1 s apart);
//  - on pagehide / tab hidden the dirty set is flushed with fetch keepalive
//    (bodies kept under the browser's 64 KB keepalive budget — anything
//    that doesn't fit stays local-newer and goes up on the next load);
//  - 401 → browser-only for this page; 503 / network → keep the dirty set
//    and retry with backoff (and again on the next page load).
// localStorage stays the source of truth on this device, so a failed push
// never loses data.
//
// Notes never leave this module except to our own API. No analytics.

import {
  coerceEntry,
  mergeProgress,
  MAX_BATCH_ENTRIES,
  MAX_NOTES_CHARS,
  type ProgressEntry,
  type ProgressMap,
} from './problem-progress';

const PREFIX = 'lc:';
export const CHANGE_EVENT = 'stacktrace:problem';
export const SYNC_EVENT = 'stacktrace:problem-sync';
const API = '/api/v1/problems/progress';
const PUSH_DEBOUNCE_MS = 1500;
/** KV rate-limits writes to the same key at ~1/sec. */
const MIN_SEND_GAP_MS = 1100;
/** Byte budget for a normal batch body (server caps at 2 MiB). */
const MAX_BATCH_BYTES = 512 * 1024;
/** keepalive bodies share a 64 KB in-flight budget per page; stay under. */
const KEEPALIVE_BUDGET_BYTES = 60 * 1024;
const BACKOFF_MIN_MS = 2000;
const BACKOFF_MAX_MS = 60_000;

export interface ChangeDetail {
  slug: string;
  entry: ProgressEntry | null;
  /** `local` = edited on this page, `sync` = adopted from the server,
   *  `tab` = another tab wrote localStorage. */
  source: 'local' | 'sync' | 'tab';
}

/** `local` = not signed in (browser-only), `synced` = server agrees. */
export type SyncState = 'local' | 'syncing' | 'synced' | 'error';

// Several page scripts may each bundle a copy of this module, so one-time
// setup and the sync status live on `window`, not in module scope.
interface SyncQueue {
  /** Slugs edited locally and not yet acknowledged by the server. */
  dirty: Set<string>;
  timer?: number;
  /** A normal (non-keepalive) batch loop is running. */
  running: boolean;
  /** Consecutive failures — drives the retry backoff. */
  failures: number;
  /** When the last PUT was sent (for KV's per-key write rate). */
  lastSendAt: number;
}
interface StoreGlobals {
  __lcInit?: boolean;
  __lcSyncState?: SyncState;
  __lcSignedOut?: boolean;
  __lcMemory?: Map<string, ProgressEntry>;
  __lcQueue?: SyncQueue;
}
const G = (typeof window !== 'undefined' ? window : {}) as StoreGlobals;

// In-memory fallback when localStorage throws (e.g. Safari private mode).
const memory = (G.__lcMemory ??= new Map<string, ProgressEntry>());
const Q = (G.__lcQueue ??= { dirty: new Set<string>(), running: false, failures: 0, lastSendAt: 0 });

export function readEntry(slug: string): ProgressEntry | null {
  try {
    const raw = localStorage.getItem(PREFIX + slug);
    if (raw != null) return coerceEntry(JSON.parse(raw));
  } catch {
    /* fall through */
  }
  return memory.get(slug) ?? null;
}

export function readAll(): ProgressMap {
  const out: ProgressMap = {};
  for (const [k, v] of memory) out[k] = v;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(PREFIX)) continue;
      const e = coerceEntry(JSON.parse(localStorage.getItem(key) ?? 'null'));
      if (e) out[key.slice(PREFIX.length)] = e;
    }
  } catch {
    /* storage unavailable — memory copy only */
  }
  return out;
}

function writeLocal(slug: string, entry: ProgressEntry): void {
  memory.set(slug, entry);
  try {
    localStorage.setItem(PREFIX + slug, JSON.stringify(entry));
  } catch {
    /* quota / disabled — memory copy still serves this page */
  }
}

function emit(detail: ChangeDetail): void {
  window.dispatchEvent(new CustomEvent<ChangeDetail>(CHANGE_EVENT, { detail }));
  window.dispatchEvent(
    new CustomEvent('stacktrace:progress', {
      detail: { key: PREFIX + detail.slug, value: detail.entry?.solved ?? false },
    }),
  );
}

export function onChange(fn: (d: ChangeDetail) => void): void {
  window.addEventListener(CHANGE_EVENT, (e) => fn((e as CustomEvent<ChangeDetail>).detail));
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
  writeLocal(slug, next);
  emit({ slug, entry: next, source: 'local' });
  schedulePush(slug);
  return next;
}

// --- Server sync ---------------------------------------------------------------

export function isSignedIn(): boolean {
  if (G.__lcSignedOut) return false;
  try {
    return /(?:^|;\s*)(?:stacktrace|sysviz)_signed_in=/.test(document.cookie);
  } catch {
    return false;
  }
}

export function getSyncState(): SyncState {
  return G.__lcSyncState ?? (isSignedIn() ? 'syncing' : 'local');
}

function setSyncState(s: SyncState): void {
  G.__lcSyncState = s;
  window.dispatchEvent(new CustomEvent<SyncState>(SYNC_EVENT, { detail: s }));
}

export function onSyncState(fn: (s: SyncState) => void): void {
  window.addEventListener(SYNC_EVENT, (e) => fn((e as CustomEvent<SyncState>).detail));
  fn(getSyncState());
}

function schedulePush(slug: string): void {
  if (!isSignedIn()) return;
  Q.dirty.add(slug);
  if (G.__lcSyncState !== 'error') setSyncState('syncing');
  scheduleFlush(PUSH_DEBOUNCE_MS);
}

function scheduleFlush(delayMs: number): void {
  if (Q.timer !== undefined) window.clearTimeout(Q.timer);
  Q.timer = window.setTimeout(() => {
    Q.timer = undefined;
    void flush();
  }, delayMs);
}

const utf8 = new TextEncoder();

/**
 * Split slugs into batch bodies under `maxEntries` and `maxBytes`. A single
 * entry that can't fit on its own is returned in `skipped`.
 */
function buildBatches(
  slugs: string[],
  maxBytes: number,
): { batches: Array<{ slugs: string[]; body: string }>; skipped: string[] } {
  const batches: Array<{ slugs: string[]; body: string }> = [];
  const skipped: string[] = [];
  let cur: Record<string, ProgressEntry> = {};
  let curSlugs: string[] = [];
  let curBytes = '{"entries":{}}'.length;
  const close = (): void => {
    if (curSlugs.length) batches.push({ slugs: curSlugs, body: JSON.stringify({ entries: cur }) });
    cur = {};
    curSlugs = [];
    curBytes = '{"entries":{}}'.length;
  };
  for (const slug of slugs) {
    const entry = readEntry(slug);
    if (!entry) continue;
    // `"slug":{…},` — key quotes, colon, comma.
    const size = utf8.encode(JSON.stringify(entry)).length + slug.length + 4;
    if (size + '{"entries":{}}'.length > maxBytes) {
      skipped.push(slug);
      continue;
    }
    if (curSlugs.length >= MAX_BATCH_ENTRIES || curBytes + size > maxBytes) close();
    cur[slug] = entry;
    curSlugs.push(slug);
    curBytes += size;
  }
  close();
  return { batches, skipped };
}

type SendOutcome = 'ok' | 'signed_out' | 'retry' | 'rejected';

async function sendBatch(body: string, keepalive: boolean): Promise<SendOutcome> {
  Q.lastSendAt = Date.now();
  let res: Response;
  try {
    res = await fetch(API, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'same-origin',
      body,
      keepalive,
    });
  } catch {
    return 'retry';
  }
  if (res.status === 401) {
    G.__lcSignedOut = true;
    return 'signed_out';
  }
  if (res.status === 503 || res.status === 429 || res.status >= 500) return 'retry';
  // 400 / 413: retrying the same payload can't help this session.
  if (!res.ok) return 'rejected';
  let data: { stale?: Record<string, unknown> };
  try {
    data = (await res.json()) as typeof data;
  } catch {
    return 'ok';
  }
  // The server held a newer copy (edited on another device) — adopt it,
  // unless the user typed something even newer while this was in flight.
  for (const [slug, raw] of Object.entries(data.stale ?? {})) {
    const server = coerceEntry(raw);
    const now = readEntry(slug);
    if (server && (!now || server.updatedAt > now.updatedAt)) {
      writeLocal(slug, server);
      emit({ slug, entry: server, source: 'sync' });
    }
  }
  return 'ok';
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => window.setTimeout(r, ms));
}

/** Send every dirty slug in spaced batches; one loop at a time per page. */
async function flush(): Promise<void> {
  if (Q.running || !isSignedIn() || Q.dirty.size === 0) return;
  Q.running = true;
  setSyncState('syncing');
  let outcome: SendOutcome = 'ok';
  let hadRejected = false;
  try {
    while (Q.dirty.size > 0 && isSignedIn()) {
      const { batches, skipped } = buildBatches([...Q.dirty].sort(), MAX_BATCH_BYTES);
      for (const s of skipped) Q.dirty.delete(s);
      const batch = batches[0];
      if (!batch) break;
      const wait = Q.lastSendAt + MIN_SEND_GAP_MS - Date.now();
      if (wait > 0) await sleep(wait);
      // Remove before sending: an edit made while in flight re-adds the slug.
      for (const s of batch.slugs) Q.dirty.delete(s);
      outcome = await sendBatch(batch.body, false);
      if (outcome === 'retry') {
        for (const s of batch.slugs) Q.dirty.add(s);
        break;
      }
      if (outcome === 'signed_out') {
        Q.dirty.clear();
        break;
      }
      if (outcome === 'rejected') hadRejected = true;
      Q.failures = 0;
    }
  } finally {
    Q.running = false;
  }

  if (outcome === 'signed_out') {
    setSyncState('local');
    return;
  }
  if (outcome === 'retry') {
    Q.failures++;
    const base = Math.min(BACKOFF_MAX_MS, BACKOFF_MIN_MS * 2 ** (Q.failures - 1));
    scheduleFlush(base + Math.floor(Math.random() * 1000));
    setSyncState('error');
    return;
  }
  if (hadRejected) {
    // Kept locally; the next page load's merge will offer them again.
    setSyncState('error');
    return;
  }
  if (Q.dirty.size > 0) scheduleFlush(PUSH_DEBOUNCE_MS);
  else setSyncState('synced');
}

/**
 * Page is going away (or hidden — mobile may never fire pagehide): send
 * what fits in the keepalive budget right now. Whatever doesn't fit stays
 * dirty / local-newer and goes up on the next load.
 */
function flushPending(): void {
  if (!isSignedIn() || Q.dirty.size === 0) return;
  if (Q.timer !== undefined) {
    window.clearTimeout(Q.timer);
    Q.timer = undefined;
  }
  const { batches } = buildBatches([...Q.dirty].sort(), KEEPALIVE_BUDGET_BYTES);
  const batch = batches[0];
  if (!batch) return;
  for (const s of batch.slugs) Q.dirty.delete(s);
  void sendBatch(batch.body, true).then((outcome) => {
    // Only reached if the page survived (e.g. tab merely hidden).
    if (outcome === 'retry') {
      for (const s of batch.slugs) Q.dirty.add(s);
      scheduleFlush(BACKOFF_MIN_MS);
    } else if (outcome === 'signed_out') {
      Q.dirty.clear();
      setSyncState('local');
    } else if (Q.dirty.size > 0) {
      scheduleFlush(PUSH_DEBOUNCE_MS);
    }
  });
}

const MAX_PULL_ATTEMPTS = 5;
let pullFailures = 0;

/** GET failed (503 / network): local edits still flush; retry the pull. */
function pullFailed(): void {
  setSyncState('error');
  pullFailures++;
  if (pullFailures < MAX_PULL_ATTEMPTS) {
    const delay = Math.min(BACKOFF_MAX_MS, BACKOFF_MIN_MS * 2 ** (pullFailures - 1));
    window.setTimeout(() => void pullAndMerge(), delay + Math.floor(Math.random() * 1000));
  }
  if (Q.dirty.size > 0) scheduleFlush(BACKOFF_MIN_MS);
}

async function pullAndMerge(): Promise<void> {
  if (!isSignedIn()) return;
  if (G.__lcSyncState !== 'error') setSyncState('syncing');
  let res: Response;
  try {
    res = await fetch(API, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
  } catch {
    pullFailed();
    return;
  }
  if (res.status === 401) {
    // Hint cookie outlived the session — stay browser-only for this page.
    G.__lcSignedOut = true;
    Q.dirty.clear();
    setSyncState('local');
    return;
  }
  if (!res.ok) {
    pullFailed();
    return;
  }
  let data: { progress?: Record<string, unknown> };
  try {
    data = (await res.json()) as typeof data;
  } catch {
    pullFailed();
    return;
  }
  pullFailures = 0;
  const server: ProgressMap = {};
  for (const [slug, raw] of Object.entries(data.progress ?? {})) {
    const e = coerceEntry(raw);
    if (e) server[slug] = e;
  }
  const { merged, pull, push: toPush } = mergeProgress(readAll(), server);
  for (const slug of pull) {
    writeLocal(slug, merged[slug]!);
    emit({ slug, entry: merged[slug]!, source: 'sync' });
  }
  for (const slug of toPush) Q.dirty.add(slug);
  if (Q.dirty.size > 0) await flush();
  else setSyncState('synced');
}

/**
 * One-time page setup: cross-tab change relay, and (when signed in) the
 * initial pull/merge/push. Safe to call from every widget's script.
 */
export function initProblemStore(): void {
  if (G.__lcInit) return;
  G.__lcInit = true;

  window.addEventListener('storage', (e) => {
    if (!e.key || !e.key.startsWith(PREFIX)) return;
    const slug = e.key.slice(PREFIX.length);
    let entry: ProgressEntry | null = null;
    try {
      entry = e.newValue ? coerceEntry(JSON.parse(e.newValue)) : null;
    } catch {
      /* ignore malformed */
    }
    if (entry) memory.set(slug, entry);
    else memory.delete(slug);
    emit({ slug, entry, source: 'tab' });
  });
  window.addEventListener('pagehide', flushPending);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushPending();
  });

  if (!isSignedIn()) {
    setSyncState('local');
    return;
  }
  void pullAndMerge();
}
