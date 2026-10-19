/* Cashory service worker
 * - App code in /assets (hashed names): cache-first → opens instantly, even offline.
 * - The page: network-first with a 3 s timeout, so a new deploy shows on the next open
 *   and a slow or missing connection falls back to the saved copy.
 * - Supabase calls (another origin) are never cached; the app keeps its own copy of your data.
 */
const STATIC = 'cashory-static-v2';
const PAGES = 'cashory-pages-v1';
const TIMEOUT = 3000;
const MAX_STATIC = 80;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(PAGES).then((c) => c.add('./')).catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== STATIC && k !== PAGES).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trim(cache) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - MAX_STATIC; i++) await cache.delete(keys[i]);
}

async function cacheFirst(req) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) {
    await cache.put(req, res.clone());
    trim(cache);
  }
  return res;
}

async function networkFirstPage(req) {
  const cache = await caches.open(PAGES);
  const net = fetch(req).then((res) => {
    if (res.ok && res.type === 'basic') cache.put('./', res.clone());
    return res;
  });
  const timeout = new Promise((resolve) => setTimeout(resolve, TIMEOUT));
  try {
    const first = await Promise.race([net, timeout]);
    if (first) return first;
  } catch {
    /* offline */
  }
  const saved = await cache.match('./');
  return saved || net;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') return event.respondWith(networkFirstPage(req));
  if (url.pathname.includes('/assets/') || url.pathname.includes('/logos/') || /\.(png|svg|webmanifest)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(req));
  }
});
