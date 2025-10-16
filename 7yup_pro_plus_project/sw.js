const CACHE_NAME = '7yup-cache-v2';
const CORE_URLS = [
  '/',
  '/index.html',
  '/home.html',
  '/saved.html',
  '/offline.html',
  '/styles.css',
  '/js/app.js',
  '/manifest.webmanifest',
  '/data/promos.json',
  '/data/reviews.json',
  '/data/faq.json',
  '/assets/fallback.webp'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_URLS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  // Only handle GET requests
  if (request.method !== 'GET') return;
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) return cachedResponse;
      return fetch(request).then(networkResponse => {
        // Clone and cache successful responses for next time
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, responseClone));
        }
        return networkResponse;
      }).catch(() => {
        // Offline fallback for navigation requests
        if (request.mode === 'navigate') {
          return caches.match('/offline.html');
        }
        // For images, return fallback
        if (request.destination === 'image') {
          return caches.match('/assets/fallback.webp');
        }
        return Promise.reject('no-match');
      });
    })
  );
});

/* 7YUP PRO+ SW UPGRADE */
const CACHE_NAME = '7yup-shell-v1';
const RUNTIME = '7yup-runtime-v1';
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).then(self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => ![CACHE_NAME, RUNTIME].includes(k)).map(k => caches.delete(k)))).then(self.clients.claim())
  );
});

// Stale-while-revalidate for images (banners)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // runtime cache for banners & images
  if (req.destination === 'image' || url.pathname.includes('/assets/banners/')) {
    event.respondWith((async () => {
      const cache = await caches.open(RUNTIME);
      const cached = await cache.match(req);
      const networkFetch = fetch(req).then((res) => {
        if (res && res.status === 200) cache.put(req, res.clone());
        return res;
      }).catch(() => cached);
      return cached || networkFetch;
    })());
    return;
  }

  // default: try cache-first for shell
  if (SHELL.some(p => url.pathname.endsWith(p.replace('./','/')))) {
    event.respondWith(
      caches.match(req).then(res => res || fetch(req))
    );
    return;
  }
});
