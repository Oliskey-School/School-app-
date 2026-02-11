/**
 * Service Worker for Background Sync
 * 
 * Handles background synchronization even when the app is closed.
 */

/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = 'school-app-v1';
const SYNC_TAG = 'offline-sync';

// Static assets to cache
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/src/main.tsx',
    '/src/App.tsx'
];

// ============================================================================
// Install Event
// ============================================================================

self.addEventListener('install', (event: ExtendableEvent) => {
    console.log('[Service Worker] Installing...');

    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[Service Worker] Caching static assets');
            return cache.addAll(STATIC_ASSETS);
        })
    );

    self.skipWaiting();
});

// ============================================================================
// Activate Event
// ============================================================================

self.addEventListener('activate', (event: ExtendableEvent) => {
    console.log('[Service Worker] Activating...');

    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );

    return self.clients.claim();
});

// ============================================================================
// Fetch Event - Cache Strategy
// ============================================================================

self.addEventListener('fetch', (event: FetchEvent) => {
    const { request } = event;

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Network-first for API calls
    if (request.url.includes('/api/') || request.url.includes('supabase.co')) {
        event.respondWith(networkFirst(request));
        return;
    }

    // Cache-first for static assets
    event.respondWith(cacheFirst(request));
});

/**
 * Cache-first strategy
 */
async function cacheFirst(request: Request): Promise<Response> {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);

    if (cached) {
        return cached;
    }

    try {
        const response = await fetch(request);

        // Cache successful responses
        if (response.status === 200) {
            cache.put(request, response.clone());
        }

        return response;
    } catch (error) {
        // Return offline fallback if available
        const fallback = await cache.match('/offline.html');
        return fallback || new Response('Offline', { status: 503 });
    }
}

/**
 * Network-first strategy
 */
async function networkFirst(request: Request): Promise<Response> {
    try {
        const response = await fetch(request);

        // Cache successful responses
        if (response.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }

        return response;
    } catch (error) {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request);

        if (cached) {
            return cached;
        }

        return new Response('Network error', { status: 503 });
    }
}

// ============================================================================
// Background Sync Event
// ============================================================================

self.addEventListener('sync', (event: any) => {
    console.log('[Service Worker] Sync event:', event.tag);

    if (event.tag === SYNC_TAG) {
        event.waitUntil(performBackgroundSync());
    }
});

/**
 * Perform background sync
 */
async function performBackgroundSync(): Promise<void> {
    console.log('[Service Worker] Performing background sync...');

    try {
        // Notify clients to trigger sync
        const clients = await self.clients.matchAll();

        clients.forEach(client => {
            client.postMessage({
                type: 'BACKGROUND_SYNC',
                timestamp: Date.now()
            });
        });

        console.log('[Service Worker] Background sync complete');
    } catch (error) {
        console.error('[Service Worker] Background sync failed:', error);
        throw error;
    }
}

// ============================================================================
// Periodic Background Sync (for supported browsers)
// ============================================================================

self.addEventListener('periodicsync', (event: any) => {
    console.log('[Service Worker] Periodic sync event:', event.tag);

    if (event.tag === 'periodic-sync') {
        event.waitUntil(performBackgroundSync());
    }
});

// ============================================================================
// Push Notifications (for future)
// ============================================================================

self.addEventListener('push', (event: PushEvent) => {
    console.log('[Service Worker] Push event received:', event);

    const data = event.data?.json() || {};

    const options: any = {
        body: data.body || 'New update available',
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        vibrate: [200, 100, 200],
        data: {
            url: data.url || '/'
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'School App', options)
    );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
    console.log('[Service Worker] Notification click:', event);

    event.notification.close();

    const url = event.notification.data?.url || '/';

    event.waitUntil(
        self.clients.matchAll({ type: 'window' }).then(clients => {
            // Focus existing window if available
            for (const client of clients) {
                if (client.url === url && 'focus' in client) {
                    return client.focus();
                }
            }

            // Open new window
            if (self.clients.openWindow) {
                return self.clients.openWindow(url);
            }
        })
    );
});

// ============================================================================
// Message Handler
// ============================================================================

self.addEventListener('message', (event: ExtendableMessageEvent) => {
    console.log('[Service Worker] Message received:', event.data);

    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data.type === 'TRIGGER_SYNC') {
        event.waitUntil(performBackgroundSync());
    }
});

// ============================================================================
// Error Handler
// ============================================================================

self.addEventListener('error', (event: ErrorEvent) => {
    console.error('[Service Worker] Error:', event.error);
});

self.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    console.error('[Service Worker] Unhandled rejection:', event.reason);
});

export { };
