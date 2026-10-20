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
// syncs with /api/v1/problems/progress: on page load it merges server rows
// with local ones by newest `updatedAt` and pushes local-newer rows up; each
// later edit is PUT after a short debounce. Failed pushes are harmless —
// the local copy stays newer, so the next page load pushes it again.
//
// Notes never leave this module except to our own API. No analytics.

import {
  coerceEntry,
  mergeProgress,
  MAX_NOTES_CHARS,
  type ProgressEntry,
  type ProgressMap,
} from './problem-progress';

const PREFIX = 'lc:';
export const CHANGE_EVENT = 'stacktrace:problem';
export const SYNC_EVENT = 'stacktrace:problem-sync';
const API = '/api/v1/problems/progress';
const PUSH_DEBOUNCE_MS = 800;

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
interface StoreGlobals {
  __lcInit?: boolean;
  __lcSyncState?: SyncState;
  __lcSignedOut?: boolean;
}
const G = (typeof window !== 'undefined' ? window : {}) as StoreGlobals;

// In-memory fallback when localStorage throws (e.g. Safari private mode).
const memory = new Map<string, ProgressEntry>();

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

const timers = new Map<string, number>();
const inFlight = new Set<Promise<unknown>>();

function schedulePush(slug: string): void {
  if (!isSignedIn()) return;
  const t = timers.get(slug);
  if (t !== undefined) window.clearTimeout(t);
  timers.set(
    slug,
    window.setTimeout(() => {
      timers.delete(slug);
      void track(push(slug));
    }, PUSH_DEBOUNCE_MS),
  );
}

function track<T>(p: Promise<T>): Promise<T> {
  inFlight.add(p);
  setSyncState('syncing');
  void p.finally(() => {
    inFlight.delete(p);
    if (inFlight.size === 0 && G.__lcSyncState === 'syncing') setSyncState('synced');
  });
  return p;
}

async function push(slug: string, keepalive = false): Promise<void> {
  const entry = readEntry(slug);
  if (!entry || !isSignedIn()) return;
  try {
    const res = await fetch(`${API}/${encodeURIComponent(slug)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(entry),
      keepalive,
    });
    if (res.status === 401) {
      G.__lcSignedOut = true;
      setSyncState('local');
      return;
    }
    if (!res.ok) {
      setSyncState('error');
      return;
    }
    const data = (await res.json()) as { status?: string; entry?: unknown };
    const server = coerceEntry(data.entry);
    // Server held a newer copy (edited on another device) — adopt it, unless
    // the user typed something even newer while this request was in flight.
    const now = readEntry(slug);
    if (data.status === 'stale' && server && (!now || server.updatedAt > now.updatedAt)) {
      writeLocal(slug, server);
      emit({ slug, entry: server, source: 'sync' });
    }
  } catch {
    setSyncState('error');
  }
}

/** Flush debounced pushes when the page is going away (tab close / nav). */
function flushPending(): void {
  for (const [slug, t] of timers) {
    window.clearTimeout(t);
    void push(slug, true);
  }
  timers.clear();
}

async function pullAndMerge(): Promise<void> {
  let res: Response;
  try {
    res = await fetch(API, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
  } catch {
    setSyncState('error');
    return;
  }
  if (res.status === 401) {
    // Hint cookie outlived the session — stay browser-only for this page.
    G.__lcSignedOut = true;
    setSyncState('local');
    return;
  }
  if (!res.ok) {
    setSyncState('error');
    return;
  }
  const data = (await res.json()) as { progress?: Record<string, unknown> };
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
  // Small fan-out so a first sync of a big local history doesn't stampede.
  const queue = [...toPush];
  const worker = async (): Promise<void> => {
    for (let s = queue.shift(); s; s = queue.shift()) await push(s);
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
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

  if (!isSignedIn()) {
    setSyncState('local');
    return;
  }
  void track(pullAndMerge());
}
