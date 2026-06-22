const CACHE_NAME = 'getnayi-cache-v3';
const DATA_CACHE_NAME = 'getnayi-data-cache-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/apple-touch-icon.png'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching offline app shell');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== DATA_CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests and internal browser schemes (like chrome-extension)
  if (request.method !== 'GET' || !request.url.startsWith('http')) {
    return;
  }

  // Navigation requests (HTML page loads) -> Network first, fallback to cached '/'
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If valid, put the fresh index.html into cache
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache); // Cache the specific page URL (or we can just put '/')
            });
          }
          return response;
        })
        .catch(() => {
          console.log('[Service Worker] Offline, serving cached shell');
          return caches.match('/').then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            // Best effort fallback
            return caches.match('/index.html');
          });
        })
    );
    return;
  }

  // API and Data Requests -> Network first, fallback to Cache
  const isApiRequest = url.pathname.startsWith('/api/') || url.hostname.includes('supabase.co');
  if (isApiRequest) {
     event.respondWith(
       fetch(request)
         .then((response) => {
           if (response && response.status === 200) {
             const responseToCache = response.clone();
             caches.open(DATA_CACHE_NAME).then((cache) => {
               cache.put(request, responseToCache);
             });
           }
           return response;
         })
         .catch(() => {
           console.log('[Service Worker] Offline API request, returning cached data');
           return caches.match(request);
         })
     );
     return;
  }

  // Static Assets and Media -> Cache first, fallback to Network
  const isStaticAsset =
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.includes('/assets/') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com');

  const isMediaAsset =
    url.pathname.endsWith('.mp4') ||
    url.pathname.endsWith('.webm') ||
    url.pathname.endsWith('.m3u8') ||
    url.pathname.endsWith('.ts') ||
    url.pathname.includes('/vz-');

  if (isStaticAsset || isMediaAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request)
          .then((response) => {
            if (response && response.status === 200 && (response.type === 'basic' || response.type === 'cors')) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache);
              });
            }
            return response;
          })
          .catch((err) => {
            console.error('[Service Worker] Asset fetch failed', err);
          });
      })
    );
    return;
  }

  // All other requests -> Network first, Cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200 && (response.type === 'basic' || response.type === 'cors')) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});
