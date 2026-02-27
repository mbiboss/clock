// AMOLED Flip Clock Service Worker
// Version: 2.0.0

const CACHE_NAME = 'flip-clock-v2.0.0';
const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './style.css',
    './script.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800;900&display=swap',
    'https://fonts.gstatic.com/s/inter/v13/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7.woff2'
];

// Create icon URLs dynamically
for (let size of [192, 512]) {
    STATIC_ASSETS.push(`./icons/icon-${size}.png`);
}

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('[Service Worker] Static assets cached successfully');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[Service Worker] Cache failed:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('[Service Worker] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('[Service Worker] Activated successfully');
                return self.clients.claim();
            })
    );
});

// Fetch event - cache first with network fallback
self.addEventListener('fetch', (event) => {
    const { request } = event;
    
    // Skip non-GET requests
    if (request.method !== 'GET') return;
    
    // Skip cross-origin requests except fonts
    const url = new URL(request.url);
    if (!url.origin.includes(self.location.origin) && 
        !url.origin.includes('fonts.googleapis.com') && 
        !url.origin.includes('fonts.gstatic.com')) {
        return;
    }
    
    event.respondWith(
        caches.match(request)
            .then((cachedResponse) => {
                // Return cached response if found
                if (cachedResponse) {
                    // Update cache in background for next time
                    fetch(request)
                        .then((networkResponse) => {
                            if (networkResponse && networkResponse.status === 200) {
                                caches.open(CACHE_NAME)
                                    .then((cache) => {
                                        cache.put(request, networkResponse.clone());
                                    });
                            }
                        })
                        .catch(() => {});
                    
                    return cachedResponse;
                }
                
                // Not in cache, fetch from network
                return fetch(request)
                    .then((networkResponse) => {
                        // Don't cache non-successful responses
                        if (!networkResponse || networkResponse.status !== 200) {
                            return networkResponse;
                        }
                        
                        // Clone response before caching
                        const responseToCache = networkResponse.clone();
                        
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(request, responseToCache);
                            });
                        
                        return networkResponse;
                    })
                    .catch((error) => {
                        console.error('[Service Worker] Fetch failed:', error);
                        
                        // Return offline fallback for navigation requests
                        if (request.mode === 'navigate') {
                            return caches.match('./index.html');
                        }
                        
                        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
                    });
            })
    );
});

// Handle messages from clients
self.addEventListener('message', (event) => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
});
