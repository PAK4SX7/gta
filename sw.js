// ============================================================
// SW.JS — Service Worker de Nortown (PWA)
// Estrategia: siempre intenta traer lo más reciente del servidor.
// Cuando hay una versión nueva, avisa a la página abierta.
// ============================================================

// Cambia este string cada vez que subas cambios importantes si quieres
// forzar una limpieza total de caché (opcional: la estrategia de abajo
// ya trae contenido fresco solo con tener internet, sin necesidad de
// tocar esto).
const CACHE_VERSION = 'nortown-cache-v1';
const CORE_ASSETS = ['./', './index.html'];

self.addEventListener('install', (event) => {
  // No esperar a que se cierren las pestañas viejas: activarse de una.
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(CORE_ASSETS).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // borrar cachés de versiones anteriores
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)));
      // tomar control inmediato de las pestañas/app ya abiertas
      await self.clients.claim();
      // avisarle a cada pestaña/app abierta que hay contenido nuevo
      const clientsList = await self.clients.matchAll({ type: 'window' });
      clientsList.forEach((client) => client.postMessage({ type: 'SW_UPDATED' }));
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const isHTML = req.mode === 'navigate' || req.destination === 'document' || req.url.endsWith('.html') || req.url.endsWith('/');

  if (isHTML) {
    // NETWORK-FIRST: siempre intenta traer la versión más reciente del servidor.
    // Si no hay internet, usa lo último que se guardó en caché.
    event.respondWith(
      fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // Para el resto de archivos (imágenes, css, js sueltos, etc.):
  // responde rápido con caché si existe, pero de fondo pide la versión
  // nueva y la guarda para la próxima vez.
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, res.clone()));
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

// Permite que la página le pida al Service Worker que se active ya
// (usado cuando el usuario confirma "actualizar ahora").
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
