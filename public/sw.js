/* StackTrace service worker: offline revision + installable app.
 *
 * Registered from src/layouts/BaseLayout.astro (production builds only).
 *
 * What it caches
 *   shell   Precached on install: `/`, `/offline/`, the `/revise/` hub, the
 *           manifest, icons, and the hashed CSS/JS those pages reference.
 *   pages   Runtime, stale-while-revalidate: every `/revise/*` sheet and every
 *           `/learn/notes/*` and `/learn/dsa/*` page the user opens. The revise
 *           hub's "Save all for offline" button fills it in bulk (CACHE_URLS
 *           message below).
 *   assets  `/_astro/*` (content-hashed, so cache-first) and other same-origin
 *           static files such as icons (stale-while-revalidate).
 *
 * What it never caches
 *   - Anything that isn't a same-origin GET.
 *   - `/api/*`, `/account*`, `/admin*`, `/login*`: not even intercepted, except
 *     that a failed navigation there still gets the offline page.
 *   - Any response that isn't a plain 200, was redirected, carries
 *     `Cache-Control: private` or `no-store`, or carries `Set-Cookie`.
 *     (Browsers hide `Set-Cookie` from service workers, so that check is only a
 *     guard; the Cache-Control check is what does the work.)
 *
 * Signed-in users and /learn/*
 *   Note and DSA pages are server-rendered. For a signed-in user the response
 *   depends on their entitlements and is sent `private, no-store`, so it is
 *   never stored. Anonymous responses are `public` and identical for every
 *   anonymous visitor (the CDN caches them too), so those are safe to keep.
 *   To stop a signed-in user being served a stale anonymous copy first, pages
 *   tell the worker the auth state (AUTH message, from the non-HttpOnly hint
 *   cookie). While signed in, /learn/* is network-first and the cached
 *   anonymous copy is only an offline fallback; signing in also purges them.
 *
 * Updates
 *   Bump VERSION whenever this file's behaviour changes (or to force clients to
 *   drop their caches). A new worker installs, then waits: the page shows an
 *   "Update available" prompt and only calls skipWaiting (SKIP_WAITING message)
 *   when the user clicks Reload. Old versioned caches are deleted on activate.
 */

const VERSION = 'v1';
const PREFIX = 'stacktrace-';
const SHELL_CACHE = `${PREFIX}shell-${VERSION}`;
const PAGES_CACHE = `${PREFIX}pages-${VERSION}`;
const ASSETS_CACHE = `${PREFIX}assets-${VERSION}`;
const META_CACHE = `${PREFIX}meta-${VERSION}`;
const CURRENT = [SHELL_CACHE, PAGES_CACHE, ASSETS_CACHE, META_CACHE];

const OFFLINE_URL = '/offline/';
const SHELL_REQUIRED = [OFFLINE_URL];
const SHELL_OPTIONAL = [
  '/',
  '/revise/',
  '/manifest.webmanifest',
  '/logo.svg',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

/** Paths whose pages are cached as the user visits them. */
const PAGE_PREFIXES = ['/revise/', '/learn/notes/', '/learn/dsa/'];
/** Paths that are never read from or written to any cache. */
const PRIVATE_PREFIXES = ['/api/', '/account', '/admin', '/login', '/logout'];
const STATIC_EXT = /\.(?:css|js|mjs|svg|png|jpe?g|webp|gif|ico|woff2?|webmanifest)$/i;
/** Bulk-save cap, so a bad message can't make the worker crawl forever. */
const MAX_BULK = 200;

const AUTH_KEY = '/__sw/auth';
let signedIn = null; // null = not loaded from META_CACHE yet

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function startsWithAny(path, prefixes) {
  return prefixes.some((p) => path === p.replace(/\/$/, '') || path.startsWith(p));
}

/** Cache key for a page: same-origin path only, so `?utm=…` doesn't fork entries. */
function pageKey(url) {
  return new URL(url.pathname, self.location.origin).href;
}

/** True when a network response may be stored and replayed to this user later. */
function isCacheable(res) {
  if (!res || res.status !== 200 || res.type !== 'basic' || res.redirected) return false;
  if (res.headers.has('set-cookie')) return false;
  const cc = (res.headers.get('cache-control') || '').toLowerCase();
  return !/(^|[\s,])(private|no-store)([\s,=]|$)/.test(cc);
}

/** Same-origin `/_astro/…` asset URLs referenced by an HTML document. */
function assetUrlsIn(html) {
  const out = new Set();
  const re = /(?:href|src)=["'](\/_astro\/[^"'?#]+)["']/g;
  let m;
  while ((m = re.exec(html))) out.add(m[1]);
  return [...out];
}

async function cacheAssets(urls) {
  const cache = await caches.open(ASSETS_CACHE);
  await Promise.all(
    urls.map(async (u) => {
      try {
        if (await cache.match(u)) return; // hashed: an entry never goes stale
        const res = await fetch(u);
        if (isCacheable(res)) await cache.put(u, res);
      } catch {
        /* best effort */
      }
    }),
  );
}

/** Fetch an HTML page, store it if cacheable, and store the assets it uses. */
async function fetchAndStorePage(cacheName, path, init) {
  const res = await fetch(path, init);
  if (!isCacheable(res)) return false;
  const html = await res.clone().text();
  const cache = await caches.open(cacheName);
  await cache.put(pageKey(new URL(path, self.location.origin)), res);
  await cacheAssets(assetUrlsIn(html));
  return true;
}

async function loadSignedIn() {
  if (signedIn !== null) return signedIn;
  try {
    const hit = await (await caches.open(META_CACHE)).match(AUTH_KEY);
    signedIn = hit ? (await hit.text()) === '1' : false;
  } catch {
    signedIn = false;
  }
  return signedIn;
}

async function setSignedIn(value) {
  const was = await loadSignedIn();
  signedIn = value;
  try {
    await (await caches.open(META_CACHE)).put(AUTH_KEY, new Response(value ? '1' : '0'));
  } catch {
    /* in-memory flag still applies */
  }
  if (value && !was) await purgeLearnPages();
}

/** Drop cached anonymous /learn/* pages (called when the user signs in). */
async function purgeLearnPages() {
  const cache = await caches.open(PAGES_CACHE);
  const keys = await cache.keys();
  await Promise.all(
    keys
      .filter((r) => new URL(r.url).pathname.startsWith('/learn/'))
      .map((r) => cache.delete(r)),
  );
}

async function offlineResponse() {
  const hit = await caches.match(OFFLINE_URL);
  return (
    hit ||
    new Response('<!doctype html><title>Offline</title><p>You are offline.</p>', {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  );
}

// ------------------------------------------------------------------
// Lifecycle
// ------------------------------------------------------------------

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const init = { cache: 'reload', credentials: 'same-origin' };
      // The offline page must be there, or there's no fallback: fail install.
      for (const u of SHELL_REQUIRED) {
        if (!(await fetchAndStorePage(SHELL_CACHE, u, init))) throw new Error('precache failed');
      }
      const cache = await caches.open(SHELL_CACHE);
      await Promise.all(
        SHELL_OPTIONAL.map(async (u) => {
          try {
            if (u.endsWith('/')) await fetchAndStorePage(SHELL_CACHE, u, init);
            else {
              const res = await fetch(u, init);
              if (isCacheable(res)) await cache.put(u, res);
            }
          } catch {
            /* optional */
          }
        }),
      );
      // No skipWaiting here: an update waits for the user's "Reload".
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => n.startsWith(PREFIX) && !CURRENT.includes(n))
          .map((n) => caches.delete(n)),
      );
      // First install: take control now so the visited page works offline.
      // (On an update, activation only happens after the user chose Reload.)
      await self.clients.claim();
    })(),
  );
});

// ------------------------------------------------------------------
// Fetch routing
// ------------------------------------------------------------------

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.headers.has('range')) return;

  const path = url.pathname;
  const isNav = req.mode === 'navigate';

  if (startsWithAny(path, PRIVATE_PREFIXES)) {
    // Never cached. A navigation still gets the offline page if the network is down.
    if (isNav) event.respondWith(fetch(req).catch(() => offlineResponse()));
    return;
  }

  if (startsWithAny(path, PAGE_PREFIXES) && (isNav || (req.headers.get('accept') || '').includes('text/html'))) {
    event.respondWith(handlePage(event, req, url));
    return;
  }

  if (path.startsWith('/_astro/')) {
    event.respondWith(cacheFirst(req));
    return;
  }

  if (STATIC_EXT.test(path) && !path.startsWith('/pagefind/') && path !== '/sw.js') {
    event.respondWith(staleWhileRevalidate(event, req, ASSETS_CACHE, req));
    return;
  }

  if (isNav) event.respondWith(networkThenShell(req, url));
});

async function handlePage(event, req, url) {
  const key = pageKey(url);
  const isLearn = url.pathname.startsWith('/learn/');
  if (isLearn && (await loadSignedIn())) {
    // Signed in: the server's answer is personalised and private. Never store
    // it; a cached anonymous copy is only used when the network is down.
    try {
      const res = await fetch(req);
      if (!isCacheable(res)) event.waitUntil(caches.open(PAGES_CACHE).then((c) => c.delete(key)));
      return res;
    } catch {
      return (await caches.match(key)) || offlineResponse();
    }
  }
  return staleWhileRevalidate(event, req, PAGES_CACHE, key, true);
}

/**
 * Serve the cached copy at once and refresh it in the background; with no
 * cached copy, wait for the network. `isPage` adds the offline fallback and
 * stores the page's /_astro assets alongside it.
 */
async function staleWhileRevalidate(event, req, cacheName, key, isPage = false) {
  const cache = await caches.open(cacheName);
  const cached = (await cache.match(key)) || (isPage ? await caches.match(key) : undefined);
  const network = fetch(req).then(async (res) => {
    if (isCacheable(res)) {
      const copy = res.clone();
      if (isPage) {
        const html = await res.clone().text();
        await cache.put(key, copy);
        await cacheAssets(assetUrlsIn(html));
      } else {
        await cache.put(key, copy);
      }
    } else if (isPage && res.status === 200) {
      // e.g. the page became private: don't keep replaying the old copy.
      await cache.delete(key);
    }
    return res;
  });
  if (cached) {
    event.waitUntil(network.catch(() => undefined));
    return cached;
  }
  try {
    return await network;
  } catch {
    if (isPage) return offlineResponse();
    return Response.error();
  }
}

async function cacheFirst(req) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (isCacheable(res)) {
    const copy = res.clone();
    caches.open(ASSETS_CACHE).then((c) => c.put(req, copy)).catch(() => undefined);
  }
  return res;
}

/** Other navigations: network only, then a precached copy (e.g. `/`), then /offline/. */
async function networkThenShell(req, url) {
  try {
    return await fetch(req);
  } catch {
    return (await caches.match(pageKey(url))) || offlineResponse();
  }
}

// ------------------------------------------------------------------
// Messages from pages
// ------------------------------------------------------------------

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (data.type === 'AUTH') {
    event.waitUntil(setSignedIn(data.signedIn === true));
    return;
  }

  if (data.type === 'CACHE_URLS') {
    const port = event.ports && event.ports[0];
    // Only same-origin /revise/ pages can be bulk-saved.
    const urls = (Array.isArray(data.urls) ? data.urls : [])
      .filter((u) => typeof u === 'string' && u.startsWith('/revise/') && !u.includes('..'))
      .slice(0, MAX_BULK);
    event.waitUntil(bulkSave(urls, port));
  }
});

async function bulkSave(urls, port) {
  const post = (msg) => {
    try {
      if (port) port.postMessage(msg);
    } catch {
      /* page went away */
    }
  };
  let done = 0;
  let failed = 0;
  const total = urls.length;
  post({ type: 'progress', done, failed, total });
  // A few at a time: quick, without hammering the origin.
  const queue = urls.slice();
  const worker = async () => {
    while (queue.length) {
      const u = queue.shift();
      let ok = false;
      try {
        ok = await fetchAndStorePage(PAGES_CACHE, u, { cache: 'no-cache', credentials: 'same-origin' });
      } catch {
        ok = false;
      }
      done += 1;
      if (!ok) failed += 1;
      post({ type: 'progress', done, failed, total });
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  post({ type: 'done', done, failed, total });
}
