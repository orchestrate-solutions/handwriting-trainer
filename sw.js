const CACHE_NAME = 'hw-trainer-v4';
const PRECACHE = [
  './',
  './index.html',
  './css/app.css',
  './js/app.js',
  './js/canvas.js',
  './js/fonts.js',
  './js/scoring.js',
  './js/templates.js',
  './img/icon.svg',
  './manifest.json',
  './vendor/cup-ui/tokens.css',
  './vendor/cup-ui/reset.css',
  './vendor/cup-ui/cup.css',
  './vendor/cup-ui/cup.js',
  './vendor/cup-ui/cup-element.js',
  './vendor/cup-ui/css/nano.css',
  './vendor/cup-ui/css/micro.css',
  './vendor/cup-ui/css/components.css',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Cache-first, with runtime caching for vendor JS and fonts
self.addEventListener('fetch', e => {
  const url = e.request.url;
  const isCacheable =
    url.includes('/vendor/cup-ui/') ||
    url.includes('fonts.googleapis.com') ||
    url.includes('fonts.gstatic.com');

  if (!isCacheable) return; // let browser handle non-cacheable requests normally

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      });
    })
  );
});
