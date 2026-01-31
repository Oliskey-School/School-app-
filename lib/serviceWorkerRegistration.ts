/**
 * Service Worker Registration
 * 
 * Registers and manages the Service Worker for background sync and offline support.
 */

/**
 * Register the Service Worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/'
            });

            console.log('✅ Service Worker registered:', registration.scope);

            // Listen for updates
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                if (newWorker) {
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('🆕 New Service Worker available');

                            // Notify user of update
                            if (confirm('New version available! Reload to update?')) {
                                newWorker.postMessage({ type: 'SKIP_WAITING' });
                                window.location.reload();
                            }
                        }
                    });
                }
            });

            // Listen for Service Worker messages
            navigator.serviceWorker.addEventListener('message', (event) => {
                console.log('[SW Message]:', event.data);

                if (event.data.type === 'BACKGROUND_SYNC') {
                    // Trigger sync engine
                    window.dispatchEvent(new CustomEvent('sw-background-sync', {
                        detail: { timestamp: event.data.timestamp }
                    }));
                }
            });

            // Request persistent storage permission
            if ('storage' in navigator && 'persist' in navigator.storage) {
                const isPersisted = await navigator.storage.persist();
                console.log(isPersisted ? '✅ Storage persisted' : '⚠️ Storage not persisted');
            }

            return registration;
        } catch (error) {
            console.error('❌ Service Worker registration failed:', error);
            return null;
        }
    }

    console.warn('⚠️ Service Workers not supported');
    return null;
}

/**
 * Unregister the Service Worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
    if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();

        for (const registration of registrations) {
            const success = await registration.unregister();
            if (success) {
                console.log('✅ Service Worker unregistered');
            }
        }

        return true;
    }

    return false;
}

/**
 * Request background sync
 */
export async function requestBackgroundSync(tag: string = 'offline-sync'): Promise<void> {
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
        try {
            const registration = await navigator.serviceWorker.ready;
            await (registration as any).sync.register(tag);
            console.log(`✅ Background sync requested: ${tag}`);
        } catch (error) {
            console.error('❌ Background sync registration failed:', error);
        }
    } else {
        console.warn('⚠️ Background Sync not supported');
    }
}

/**
 * Request periodic background sync (if supported)
 */
export async function requestPeriodicSync(
    tag: string = 'periodic-sync',
    minInterval: number = 12 * 60 * 60 * 1000 // 12 hours
): Promise<void> {
    if ('serviceWorker' in navigator && 'periodicSync' in ServiceWorkerRegistration.prototype) {
        try {
            const registration = await navigator.serviceWorker.ready;
            await (registration as any).periodicSync.register(tag, {
                minInterval
            });
            console.log(`✅ Periodic sync requested: ${tag}`);
        } catch (error) {
            console.error('❌ Periodic sync registration failed:', error);
        }
    } else {
        console.warn('⚠️ Periodic Sync not supported');
    }
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
    if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        console.log(`Notification permission: ${permission}`);
        return permission;
    }

    return 'denied';
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPushNotifications(
    publicKey: string
): Promise<PushSubscription | null> {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
            const registration = await navigator.serviceWorker.ready;

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey)
            });

            console.log('✅ Push subscription created');
            return subscription;
        } catch (error) {
            console.error('❌ Push subscription failed:', error);
            return null;
        }
    }

    return null;
}

/**
 * Convert base64 string to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
}

/**
 * Check if Service Worker is supported
 */
export function isServiceWorkerSupported(): boolean {
    return 'serviceWorker' in navigator;
}

/**
 * Check if background sync is supported
 */
export function isBackgroundSyncSupported(): boolean {
    return 'serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype;
}

/**
 * Check if periodic sync is supported
 */
export function isPeriodicSyncSupported(): boolean {
    return 'serviceWorker' in navigator && 'periodicSync' in ServiceWorkerRegistration.prototype;
}

/**
 * Get Service Worker registration status
 */
export async function getServiceWorkerStatus(): Promise<{
    registered: boolean;
    active: boolean;
    waiting: boolean;
    installing: boolean;
}> {
    if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();

        if (registration) {
            return {
                registered: true,
                active: !!registration.active,
                waiting: !!registration.waiting,
                installing: !!registration.installing
            };
        }
    }

    return {
        registered: false,
        active: false,
        waiting: false,
        installing: false
    };
}
