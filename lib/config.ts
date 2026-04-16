/**
 * Central configuration for API and Socket URLs
 * Automatically detects environment to switch between localhost and production
 */

const getBaseUrl = (type: 'api' | 'socket') => {
    const isLocal = typeof window !== 'undefined' && 
                    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    const envUrl = type === 'api' ? (import.meta.env as any).VITE_API_URL : (import.meta.env as any).VITE_SOCKET_URL;

    if (envUrl) return envUrl;

    if (isLocal) {
        return type === 'api' ? 'http://localhost:5000/api' : 'http://localhost:5000';
    }

    // Production Fallbacks (Railway)
    const RAILWAY_API = 'https://school-app-production-a59a.up.railway.app/api';
    const RAILWAY_SOCKET = 'https://school-app-production-a59a.up.railway.app';

    return type === 'api' ? RAILWAY_API : RAILWAY_SOCKET;
};

export const API_BASE_URL = getBaseUrl('api');
export const SOCKET_URL = getBaseUrl('socket');

export default {
    API_BASE_URL,
    SOCKET_URL
};
