const CACHE_NAME = 'moja-strona-cache-v1';
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/offline.html'
  // Dodaj tutaj inne pliki, np. CSS, JS, obrazy
];

self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Instalacja');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[ServiceWorker] Cacheowanie plików');
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Aktywacja');
  event.waitUntil(
    caches.keys().then(keyList =>
      Promise.all(
        keyList.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[ServiceWorker] Usuwanie starego cache:', key);
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Najpierw spróbuj odpowiedzieć z cache, jeśli nie ma to z sieci
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
