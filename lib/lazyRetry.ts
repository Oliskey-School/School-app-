import { lazy } from 'react';

/**
 * Utility to handle 'Failed to fetch dynamically imported module' errors.
 *
 * Root cause of the previous behaviour: ANY transient chunk-fetch failure
 * (a momentary network blip, the dev server mid-rebuild, a brief CDN hiccup)
 * was treated identically to "a new version was deployed and this chunk no
 * longer exists" — both immediately unregistered the service worker, wiped
 * every Cache Storage entry, and hard-reloaded the whole page. That's a
 * legitimate recovery for the real stale-deployment case, but it's a wildly
 * disproportionate response to a one-off network error, and it destroys all
 * in-memory app state (e.g. mid-game progress) even though it doesn't
 * actually touch sessionStorage/auth.
 *
 * Fix: retry the *specific failed import* a couple of times with a short
 * backoff first — this alone resolves the transient case without ever
 * reloading. Only escalate to the destructive reload-and-wipe-caches path
 * once retries are exhausted, and scope the "already reloaded" guard per
 * chunk (not one global flag) so one chunk's failure can't block a
 * different chunk from getting its own retry+reload later, while still
 * guaranteeing we never reload more than once for the same chunk.
 */
const RETRY_ATTEMPTS = 2;
const RETRY_DELAY_MS = 500;

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const isChunkFetchError = (error: any) =>
  error?.name === 'ChunkLoadError' ||
  error?.message?.includes('Failed to fetch') ||
  error?.message?.includes('dynamically imported module') ||
  error?.message?.includes('dynamic import');

export const lazyWithRetry = (componentImport: () => Promise<any>, chunkKey?: string) =>
  lazy(async () => {
    let lastError: any;

    for (let attempt = 0; attempt <= RETRY_ATTEMPTS; attempt++) {
      try {
        return await componentImport();
      } catch (error: any) {
        lastError = error;
        if (!isChunkFetchError(error)) {
          throw error;
        }
        if (attempt < RETRY_ATTEMPTS) {
          console.warn(`Chunk load failed (attempt ${attempt + 1}/${RETRY_ATTEMPTS + 1}), retrying...`);
          await wait(RETRY_DELAY_MS * (attempt + 1));
        }
      }
    }

    // Retries exhausted — this looks like a genuine stale chunk (a new
    // version was deployed and the old chunk is truly gone). Force one hard
    // refresh per chunk to pick up the new build.
    const reloadKey = `chunk-reload-attempted:${chunkKey || componentImport.toString()}`;
    const alreadyReloaded = window.sessionStorage.getItem(reloadKey) === 'true';

    if (!alreadyReloaded) {
      console.warn('🔄 Chunk load failed after retries. Refreshing to fetch the newest version...');
      window.sessionStorage.setItem(reloadKey, 'true');

      // 🚨 Wipe Service Worker caches before reloading, or PWA will serve the dead index.html again.
      // Note: this only clears Cache Storage, never sessionStorage/localStorage — the user's
      // auth session and tab-scoped state are untouched by this reload.
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

    throw lastError;
  });
