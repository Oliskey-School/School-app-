/**
 * Central configuration for API and Socket URLs
 * Automatically detects environment to switch between localhost and production
 */

const getBaseUrl = (type: 'api' | 'socket') => {
    const isLocal = typeof window !== 'undefined' && 
                    (window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' || 
                     window.location.hostname === 'host.docker.internal');

    const envUrl = type === 'api' ? (import.meta.env as any).VITE_API_URL : (import.meta.env as any).VITE_SOCKET_URL;

    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const defaultSameOrigin = currentOrigin ? (type === 'api' ? `${currentOrigin}/api` : currentOrigin) : '';

    let url = envUrl || (isLocal ? '' : defaultSameOrigin);

    if (!url) {
        if (isLocal) {
            // Same-origin, same as the production branch below — NOT a hardcoded
            // absolute http://host:5000 URL. Vite's dev server AND `vite preview`
            // both proxy /api to the backend (see vite.config.mts, which resolves
            // BACKEND_PORT || PORT || 5000 for that proxy's target), so a relative
            // path here goes through that proxy and reaches the backend on
            // whatever port it actually bound. A hardcoded absolute URL bypasses
            // the proxy entirely (it's a direct cross-origin request to that exact
            // port) and silently breaks the moment the backend runs on a
            // different port than 5000 — which is exactly BACKEND_PORT=5099 in
            // the E2E workflow: every API call died with net::ERR_CONNECTION_REFUSED
            // against a nothing-listening port 5000, even though the proxy itself
            // was already correctly pointed at 5099.
            //
            // Socket.IO cannot be proxied the same way a plain HTTP path can (its
            // own client opens a fresh connection using this URL directly, not a
            // browser-relative fetch), so it keeps the explicit host:port guess —
            // only the api branch changes here.
            const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
            url = type === 'api' ? '/api' : `http://${hostname}:5000`;
        } else {
            // Production default: served same-origin behind the reverse proxy (nginx).
            url = type === 'api' ? '/api' : '';
        }
    }

    // Ensure API URLs always have /api suffix if they don't already
    if (type === 'api' && !url.endsWith('/api')) {
        url = url.endsWith('/') ? `${url}api` : `${url}/api`;
    }

    return url;
};

export const API_BASE_URL = getBaseUrl('api');
export const SOCKET_URL = getBaseUrl('socket');

export const APP_VERSION = (import.meta.env as any).VITE_APP_VERSION || (process.env as any).APP_VERSION || '0.5.38';

export default {
    API_BASE_URL,
    SOCKET_URL,
    APP_VERSION
};
