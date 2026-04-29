/**
 * Central configuration for API and Socket URLs
 * Automatically detects environment to switch between localhost and production
 */

const getBaseUrl = (type: 'api' | 'socket') => {
    const isLocal = typeof window !== 'undefined' && 
                    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    const envUrl = type === 'api' ? (import.meta.env as any).VITE_API_URL : (import.meta.env as any).VITE_SOCKET_URL;

    const RAILWAY_API = 'https://school-app-production-a59a.up.railway.app/api';
    const RAILWAY_SOCKET = 'https://school-app-production-a59a.up.railway.app';

    let url = envUrl;

    if (!url) {
        if (isLocal) {
            url = type === 'api' ? 'http://localhost:5000/api' : 'http://localhost:5000';
        } else {
            url = type === 'api' ? RAILWAY_API : RAILWAY_SOCKET;
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

export const APP_VERSION = (process.env as any).APP_VERSION || '0.5.36';

export default {
    API_BASE_URL,
    SOCKET_URL,
    APP_VERSION
};
