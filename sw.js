// ============================================================
// SW.JS — Service Worker mínimo para hacer instalable la PWA
// (requisito de Chrome/Android para mostrar el prompt de instalación)
// ============================================================
const CACHE_NAME = 'nortown-cache-v1';
const ASSETS = ['./index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(()=>{})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Estrategia: cache primero para el shell (index/manifest/icons),
// red directa para todo lo demás (Three.js CDN, WebSocket, etc).
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const isShellAsset = ASSETS.some((a) => req.url.endsWith(a.replace('./', '')));
  if (isShellAsset) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req))
    );
  }
});
