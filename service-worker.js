// Textura AI Service Worker v6
// Goal: HTML pages (/, index.html, privacy.html, terms.html) always fresh (network-first)
// Simple fallback: agar offline ho to last cached index.html
// No big precache list (sirf dynamic caching for non-HTML assets)
// Update register: navigator.serviceWorker.register('./service-worker.js?v=6')

const VERSION = 'v6';

// Install: just skipWaiting (no precache of all assets now)
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate: claim clients + purana cache clean (pattern: textura-dyn-*)
self.addEventListener('activate', async (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(k => k.startsWith('textura-dyn-') && k !== dynCacheName())
        .map(k => caches.delete(k))
    );
    await clients.claim();
  })());
});

function dynCacheName() {
  return 'textura-dyn-' + VERSION;
}

// Network-first for HTML
async function networkFirst(req) {
  try {
    const fresh = await fetch(req);
    // Cache latest HTML (optional)
    const cache = await caches.open(dynCacheName());
    cache.put(req, fresh.clone());
    return fresh;
  } catch (e) {
    // Offline fallback: cached copy ya else offline response
    const cached = await caches.match(req);
    return cached || await caches.match('./index.html') ||
      new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

// Cache-first (with lazy add) for other GET requests (images, CSS, JS)
async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const resp = await fetch(req);
    // Only cache successful (status 200) & same-origin
    if (resp.ok && (req.url.startsWith(self.location.origin))) {
      const cache = await caches.open(dynCacheName());
      cache.put(req, resp.clone());
    }
    return resp;
  } catch {
    // Offline fallback (image placeholder maybe)
    if (req.destination === 'image') {
      return new Response('', { status: 404 });
    }
    return new Response('Offline', { status: 503 });
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  const isHTML =
    req.headers.get('accept')?.includes('text/html') ||
    url.pathname === '/' ||
    url.pathname.endsWith('/index.html') ||
    url.pathname.endsWith('/privacy.html') ||
    url.pathname.endsWith('/terms.html');

  if (isHTML) {
    event.respondWith(networkFirst(req));
    return;
  }

  // Otherwise cache-first
  event.respondWith(cacheFirst(req));
});

// (Optional) message listener for future skipWaiting triggers
self.addEventListener('message', (event) => {
  if (event.data === 'SW_SKIP_WAITING') {
    self.skipWaiting();
  }
});
