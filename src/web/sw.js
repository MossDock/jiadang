/* 家当 Service Worker：应用外壳缓存，支持离线查看 */
const CACHE = 'jiadang-v1';
const SHELL = [
  './', './index.html', './app.css', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png',
  './js/01-schema.js', './js/02-utils.js', './js/03-store.js', './js/04-reminders.js',
  './js/05-view-home.js', './js/06-view-items.js', './js/07-view-bills.js',
  './js/08-view-reminders.js', './js/09-view-settings.js', './js/10-app.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => Promise.all(
      SHELL.map((u) => c.add(u).catch(() => null))
    ))).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // stale-while-revalidate：先秒开缓存，后台拉新版
  e.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((res) => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => null);
      if (cached) return cached;
      return network.then((res) => res || caches.match('./index.html') || Response.error());
    })
  );
});
