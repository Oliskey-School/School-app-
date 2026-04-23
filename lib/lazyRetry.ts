import { lazy } from 'react';

/**
 * Utility to handle 'Failed to fetch dynamically imported module' errors.
 * This happens when a new version is deployed and the old chunks are gone.
 * It retries the import once after a hard reload.
 */
export const lazyWithRetry = (componentImport: () => Promise<any>) =>
  lazy(async () => {
    const pageHasBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
    );

    try {
      const component = await componentImport();
      window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
      return component;
    } catch (error: any) {
      // Check for fetch errors (ChunkLoadError or TypeError)
      const isFetchError = error?.name === 'ChunkLoadError' || 
                          error?.message?.includes('Failed to fetch') ||
                          error?.message?.includes('dynamic import');

      if (isFetchError && !pageHasBeenForceRefreshed) {
        console.warn('🔄 Chunk load failed. Force refreshing app to get newest version...');
        window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
        
        // 🚨 CRITICAL: Wipe Service Worker caches before reloading, or PWA will serve the dead index.html again
        if ('caches' in window) {
            caches.keys().then(names => Promise.all(names.map(n => caches.delete(n))));
        }
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(registrations => {
                Promise.all(registrations.map(r => r.unregister())).then(() => {
                    window.location.reload();
                });
            });
        } else {
            window.location.reload();
        }

        // Return a promise that never resolves to avoid rendering while reloading
        return new Promise(() => {});
      }

      throw error;
    }
  });
