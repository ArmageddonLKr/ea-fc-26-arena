const CACHE = 'eafc26-v28';
const ASSETS = [
  './',
  './index.html',
  './admin.html',
  './manifest.json',
  './styles/main.css',
  './js/app.js',
  './teams.json',
  './assets/logo.svg',
  './assets/fonts/rajdhani-500.woff2',
  './assets/fonts/rajdhani-600.woff2',
  './assets/fonts/rajdhani-700.woff2',
  './assets/fonts/barlow-condensed-300.woff2',
  './assets/fonts/barlow-condensed-600.woff2',
  './assets/fonts/barlow-condensed-700.woff2',
  './assets/fonts/barlow-condensed-900.woff2',
  './assets/fonts/barlow-condensed-italic-900.woff2',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      const net = fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);

      return cached || net;
    })
  );
});
