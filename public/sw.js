// Washermann Vendor — minimal, safe service worker.
//
// Goals: make the app installable, keep it usable offline at a basic level, and
// never serve stale app code. Strategy:
//   • navigations → network-first (always fresh when online, so a deploy shows
//     immediately), with a cached fallback when offline.
//   • everything else (JS/CSS/data) → passthrough, so chunks are never stale.
// Updates are applied only when the user accepts the in-app "refresh" prompt
// (we wait rather than skipWaiting automatically).

const CACHE = 'wm-vendor-v1';

self.addEventListener('install', () => {
  // Do NOT skipWaiting here — the new worker waits until the user chooses to
  // update (PwaProvider posts SKIP_WAITING), so we never reload mid-task.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      // Deliberately NOT calling clients.claim(): it would fire controllerchange
      // on first install and reload the page. The SW takes control on the next
      // navigation instead, so the only reload is the user-accepted update.
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (req.mode !== 'navigate') return; // only handle page navigations

  event.respondWith(
    (async () => {
      try {
        const net = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put(req, net.clone());
        return net;
      } catch {
        const cached = await caches.match(req);
        return cached || (await caches.match('/dashboard')) || Response.error();
      }
    })(),
  );
});
