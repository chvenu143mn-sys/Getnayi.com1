const CACHE_NAME = 'getnayi-cache-v2';
const ASSETS_TO_CACHE = [
  '/',
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
          if (cacheName !== CACHE_NAME) {
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

  // Navigation requests (HTML page loads) -> Cache first for app shell
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/').then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).catch(() => {
          console.log('[Service Worker] Offline, no cached shell');
        });
      })
    );
    return;
  }

  // Static Assets (CSS, JS, Fonts, Icons) -> Cache first, fallback to Network
  const isStaticAsset = 
    url.pathname.endsWith('.js') || 
    url.pathname.endsWith('.css') || 
    url.pathname.endsWith('.png') || 
    url.pathname.endsWith('.ico') || 
    url.pathname.endsWith('.svg') || 
    url.pathname.includes('/assets/') || 
    url.hostname.includes('fonts.googleapis.com') || 
    url.hostname.includes('fonts.gstatic.com');

  // Video and Media Assets -> Cache first, fallback to Network
  const isMediaAsset = 
    url.pathname.endsWith('.mp4') ||
    url.pathname.endsWith('.webm') ||
    url.pathname.endsWith('.m3u8') ||
    url.pathname.endsWith('.ts') ||
    url.pathname.includes('/vz-'); // BunnyCDN video delivery pattern often used

  if (isStaticAsset || isMediaAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request)
          .then((response) => {
            // If valid, clone and put in cache
            if (response && response.status === 200 && (response.type === 'basic' || response.type === 'cors')) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache);
              });
            }
            return response;
          })
          .catch((err) => {
            console.error('[Service Worker] Fetch failed hook', err);
          });
      })
    );
    return;
  }

  // Data and API Requests (Supabase, Backend) -> Network first, fallback to Cache
  const isApiRequest = url.pathname.startsWith('/api/') || url.hostname.includes('supabase.co');

  if (isApiRequest) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME + '-data').then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // All other requests -> standard Network load
  event.respondWith(fetch(request));
});
