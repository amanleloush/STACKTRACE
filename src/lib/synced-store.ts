// Browser-only "localStorage first + KV sync" store, shared by the
// company-tracker progress (problem-store.ts) and the mistakes notebook
// (mistakes-store.ts).
//
// localStorage is always the first write: `<prefix><key>` → entry JSON,
// every access wrapped in try/catch (private mode / quota / disabled
// storage just degrades to in-memory for the page). Every change dispatches
// `cfg.changeEvent` on window so all widgets on the page repaint.
//
// When the `stacktrace_signed_in` hint cookie is present the store also
// syncs with `cfg.api` (one Workers KV doc per user):
//  - on page load: GET, merge newest-`updatedAt`-wins with localStorage,
//    and push the local-newer entries in batches;
//  - each edit marks its key dirty; dirty keys go up in ONE batch PUT
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
// Entries never leave this module except to our own API. No analytics.

import { mergeLww, type Timestamped } from './lww';

const PUSH_DEBOUNCE_MS = 1500;
/** KV rate-limits writes to the same key at ~1/sec. */
const MIN_SEND_GAP_MS = 1100;
/** Byte budget for a normal batch body (servers cap at ≥1 MiB). */
const MAX_BATCH_BYTES = 512 * 1024;
/** keepalive bodies share a 64 KB in-flight budget per page; stay under. */
const KEEPALIVE_BUDGET_BYTES = 60 * 1024;
const BACKOFF_MIN_MS = 2000;
const BACKOFF_MAX_MS = 60_000;
const MAX_PULL_ATTEMPTS = 5;

export interface ChangeDetail<E> {
  key: string;
  entry: E | null;
  /** `local` = edited on this page, `sync` = adopted from the server,
   *  `tab` = another tab wrote localStorage. */
  source: 'local' | 'sync' | 'tab';
}

/** `local` = not signed in (browser-only), `synced` = server agrees. */
export type SyncState = 'local' | 'syncing' | 'synced' | 'error';

export interface SyncedStoreConfig<E extends Timestamped> {
  /** Unique per store; names the window globals. */
  name: string;
  /** localStorage key prefix, e.g. `lc:`. */
  prefix: string;
  /** Keys that don't pass are ignored when read back from storage. */
  isValidKey: (key: string) => boolean;
  /** Lenient read of a stored / server entry; null drops it. */
  coerce: (raw: unknown) => E | null;
  api: string;
  /** Map field in the GET response, e.g. `progress`. */
  responseField: string;
  changeEvent: string;
  syncEvent: string;
  maxBatchEntries: number;
  /** Extra events to fire alongside `changeEvent`. */
  onEmit?: (detail: ChangeDetail<E>) => void;
}

// Several page scripts may each bundle a copy of this module, so one-time
// setup, the sync queue and the sync status live on `window`, not in module
// scope.
interface SyncQueue {
  /** Keys edited locally and not yet acknowledged by the server. */
  dirty: Set<string>;
  timer?: number;
  /** A normal (non-keepalive) batch loop is running. */
  running: boolean;
  /** Consecutive failures — drives the retry backoff. */
  failures: number;
  /** When the last PUT was sent (for KV's per-key write rate). */
  lastSendAt: number;
}
interface StoreGlobals<E> {
  init?: boolean;
  syncState?: SyncState;
  signedOut?: boolean;
  memory: Map<string, E>;
  queue: SyncQueue;
  pullFailures: number;
}

export interface SyncedStore<E extends Timestamped> {
  readEntry(key: string): E | null;
  readAll(): Record<string, E>;
  /** Persist a local edit, notify listeners, and queue a server push. */
  write(key: string, entry: E): void;
  onChange(fn: (d: ChangeDetail<E>) => void): void;
  isSignedIn(): boolean;
  getSyncState(): SyncState;
  onSyncState(fn: (s: SyncState) => void): void;
  /** One-time page setup: cross-tab relay and (signed in) the initial
   *  pull/merge/push. Safe to call from every widget's script. */
  init(): void;
}

export function createSyncedStore<E extends Timestamped>(cfg: SyncedStoreConfig<E>): SyncedStore<E> {
  const W = (typeof window !== 'undefined' ? window : {}) as unknown as Record<string, StoreGlobals<E> | undefined>;
  const G = (W[`__st_${cfg.name}`] ??= {
    // In-memory fallback when localStorage throws (e.g. Safari private mode).
    memory: new Map<string, E>(),
    queue: { dirty: new Set<string>(), running: false, failures: 0, lastSendAt: 0 },
    pullFailures: 0,
  });
  const memory = G.memory;
  const Q = G.queue;
  const PREFIX = cfg.prefix;

  function readEntry(key: string): E | null {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw != null) return cfg.coerce(JSON.parse(raw));
    } catch {
      /* fall through */
    }
    return memory.get(key) ?? null;
  }

  function readAll(): Record<string, E> {
    const out: Record<string, E> = {};
    for (const [k, v] of memory) out[k] = v;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(PREFIX)) continue;
        const k = key.slice(PREFIX.length);
        if (!cfg.isValidKey(k)) continue;
        let e: E | null = null;
        try {
          e = cfg.coerce(JSON.parse(localStorage.getItem(key) ?? 'null'));
        } catch {
          /* one malformed value must not hide the rest */
        }
        if (e) out[k] = e;
      }
    } catch {
      /* storage unavailable — memory copy only */
    }
    return out;
  }

  function writeLocal(key: string, entry: E): void {
    memory.set(key, entry);
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(entry));
    } catch {
      /* quota / disabled — memory copy still serves this page */
    }
  }

  function emit(detail: ChangeDetail<E>): void {
    window.dispatchEvent(new CustomEvent<ChangeDetail<E>>(cfg.changeEvent, { detail }));
    cfg.onEmit?.(detail);
  }

  function onChange(fn: (d: ChangeDetail<E>) => void): void {
    window.addEventListener(cfg.changeEvent, (e) => fn((e as CustomEvent<ChangeDetail<E>>).detail));
  }

  function write(key: string, entry: E): void {
    writeLocal(key, entry);
    emit({ key, entry, source: 'local' });
    schedulePush(key);
  }

  // --- Server sync -------------------------------------------------------------

  function isSignedIn(): boolean {
    if (G.signedOut) return false;
    try {
      return /(?:^|;\s*)(?:stacktrace|sysviz)_signed_in=/.test(document.cookie);
    } catch {
      return false;
    }
  }

  function getSyncState(): SyncState {
    return G.syncState ?? (isSignedIn() ? 'syncing' : 'local');
  }

  function setSyncState(s: SyncState): void {
    G.syncState = s;
    window.dispatchEvent(new CustomEvent<SyncState>(cfg.syncEvent, { detail: s }));
  }

  function onSyncState(fn: (s: SyncState) => void): void {
    window.addEventListener(cfg.syncEvent, (e) => fn((e as CustomEvent<SyncState>).detail));
    fn(getSyncState());
  }

  function schedulePush(key: string): void {
    if (!isSignedIn()) return;
    Q.dirty.add(key);
    if (G.syncState !== 'error') setSyncState('syncing');
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
  const EMPTY_BODY_BYTES = '{"entries":{}}'.length;

  /**
   * Split keys into batch bodies under `maxBatchEntries` and `maxBytes`. A
   * single entry that can't fit on its own is returned in `skipped`.
   */
  function buildBatches(
    keys: string[],
    maxBytes: number,
  ): { batches: Array<{ keys: string[]; body: string }>; skipped: string[] } {
    const batches: Array<{ keys: string[]; body: string }> = [];
    const skipped: string[] = [];
    let cur: Record<string, E> = {};
    let curKeys: string[] = [];
    let curBytes = EMPTY_BODY_BYTES;
    const close = (): void => {
      if (curKeys.length) batches.push({ keys: curKeys, body: JSON.stringify({ entries: cur }) });
      cur = {};
      curKeys = [];
      curBytes = EMPTY_BODY_BYTES;
    };
    for (const key of keys) {
      const entry = readEntry(key);
      if (!entry) continue;
      // `"key":{…},` — key quotes, colon, comma.
      const size = utf8.encode(JSON.stringify(entry)).length + utf8.encode(key).length + 4;
      if (size + EMPTY_BODY_BYTES > maxBytes) {
        skipped.push(key);
        continue;
      }
      if (curKeys.length >= cfg.maxBatchEntries || curBytes + size > maxBytes) close();
      cur[key] = entry;
      curKeys.push(key);
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
      res = await fetch(cfg.api, {
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
      G.signedOut = true;
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
    // unless the user edited something even newer while this was in flight.
    for (const [key, raw] of Object.entries(data.stale ?? {})) {
      const server = cfg.coerce(raw);
      const now = readEntry(key);
      if (server && (!now || server.updatedAt > now.updatedAt)) {
        writeLocal(key, server);
        emit({ key, entry: server, source: 'sync' });
      }
    }
    return 'ok';
  }

  function sleep(ms: number): Promise<void> {
    return new Promise((r) => window.setTimeout(r, ms));
  }

  /** Send every dirty key in spaced batches; one loop at a time per page. */
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
        // Remove before sending: an edit made while in flight re-adds the key.
        for (const s of batch.keys) Q.dirty.delete(s);
        outcome = await sendBatch(batch.body, false);
        if (outcome === 'retry') {
          for (const s of batch.keys) Q.dirty.add(s);
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
    for (const s of batch.keys) Q.dirty.delete(s);
    void sendBatch(batch.body, true).then((outcome) => {
      // Only reached if the page survived (e.g. tab merely hidden).
      if (outcome === 'retry') {
        for (const s of batch.keys) Q.dirty.add(s);
        scheduleFlush(BACKOFF_MIN_MS);
      } else if (outcome === 'signed_out') {
        Q.dirty.clear();
        setSyncState('local');
      } else if (Q.dirty.size > 0) {
        scheduleFlush(PUSH_DEBOUNCE_MS);
      }
    });
  }

  /** GET failed (503 / network): local edits still flush; retry the pull. */
  function pullFailed(): void {
    setSyncState('error');
    G.pullFailures++;
    if (G.pullFailures < MAX_PULL_ATTEMPTS) {
      const delay = Math.min(BACKOFF_MAX_MS, BACKOFF_MIN_MS * 2 ** (G.pullFailures - 1));
      window.setTimeout(() => void pullAndMerge(), delay + Math.floor(Math.random() * 1000));
    }
    if (Q.dirty.size > 0) scheduleFlush(BACKOFF_MIN_MS);
  }

  async function pullAndMerge(): Promise<void> {
    if (!isSignedIn()) return;
    if (G.syncState !== 'error') setSyncState('syncing');
    let res: Response;
    try {
      res = await fetch(cfg.api, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
    } catch {
      pullFailed();
      return;
    }
    if (res.status === 401) {
      // Hint cookie outlived the session — stay browser-only for this page.
      G.signedOut = true;
      Q.dirty.clear();
      setSyncState('local');
      return;
    }
    if (!res.ok) {
      pullFailed();
      return;
    }
    let data: Record<string, unknown>;
    try {
      data = (await res.json()) as typeof data;
    } catch {
      pullFailed();
      return;
    }
    G.pullFailures = 0;
    const server: Record<string, E> = {};
    const remote = data[cfg.responseField];
    if (typeof remote === 'object' && remote !== null) {
      for (const [key, raw] of Object.entries(remote as Record<string, unknown>)) {
        if (!cfg.isValidKey(key)) continue;
        const e = cfg.coerce(raw);
        if (e) server[key] = e;
      }
    }
    const { merged, pull, push: toPush } = mergeLww(readAll(), server);
    for (const key of pull) {
      writeLocal(key, merged[key]!);
      emit({ key, entry: merged[key]!, source: 'sync' });
    }
    for (const key of toPush) Q.dirty.add(key);
    if (Q.dirty.size > 0) await flush();
    else setSyncState('synced');
  }

  function init(): void {
    if (G.init) return;
    G.init = true;

    window.addEventListener('storage', (e) => {
      if (!e.key || !e.key.startsWith(PREFIX)) return;
      const key = e.key.slice(PREFIX.length);
      if (!cfg.isValidKey(key)) return;
      let entry: E | null = null;
      try {
        entry = e.newValue ? cfg.coerce(JSON.parse(e.newValue)) : null;
      } catch {
        /* ignore malformed */
      }
      if (entry) memory.set(key, entry);
      else memory.delete(key);
      emit({ key, entry, source: 'tab' });
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

  return { readEntry, readAll, write, onChange, isSignedIn, getSyncState, onSyncState, init };
}
