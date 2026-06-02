/**
 * PWA Installation and Service Worker Registration
 * Handles PWA install prompts and service worker lifecycle
 */

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Register service worker - MODIFIED TO UNREGISTER IN DEV
export function registerServiceWorker() {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        return;
    }

    // In development, unregister service workers and clear caches to avoid HMR/import issues
    const isDev = window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.port === '3000' ||
        window.location.port === '5173';

    if (isDev) {
        // Clear all caches
        if ('caches' in window) {
            caches.keys().then((names) => {
                for (const name of names) {
                    caches.delete(name);
                }
            });
        }

        navigator.serviceWorker.getRegistrations().then((registrations) => {
            for (const registration of registrations) {
                registration.unregister().then(success => {
                    if (success) {
                        console.log('✅ Service Worker unregistered for development and caches cleared');
                        // Force a one-time reload to clear the controller if it exists
                        if (navigator.serviceWorker.controller) {
                            window.location.reload();
                        }
                    }
                });
            }
        });
        return;
    }

    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered with scope:', registration.scope);
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    });
}

// Hook for PWA install prompt
export function usePWAInstall() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
        }

        const handleBeforeInstall = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
        };

        const handleAppInstalled = () => {
            setIsInstalled(true);
            setDeferredPrompt(null);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstall);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const promptInstall = async () => {
        if (!deferredPrompt) return false;

        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;

        if (choiceResult.outcome === 'accepted') {
            setDeferredPrompt(null);
            return true;
        }

        return false;
    };

    return {
        canInstall: !!deferredPrompt,
        isInstalled,
        promptInstall
    };
}

// Cache important data for offline use
export async function cacheOfflineData(urls: string[]) {
    if (!('serviceWorker' in navigator)) return;

    const registration = await navigator.serviceWorker.ready;
    registration.active?.postMessage({
        type: 'CACHE_URLS',
        urls
    });
}

// Check if app is running in standalone mode (installed PWA)
export function isStandalone(): boolean {
    if (typeof window === 'undefined') return false;

    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://')
    );
}

// Hook for monitoring offline/online status
export function useOfflineStatus() {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return { isOffline, isOnline: !isOffline };
}

// ---------------------------------------------------------------------------
// PWA install analytics + cross-device status (frontend → /api/pwa)
// ---------------------------------------------------------------------------
import { getAuthToken, API_BASE_URL } from './apiHelpers';

export type PwaPlatform = 'ios' | 'android' | 'desktop' | 'other';

/** Best-effort device/platform detection for install instructions + analytics. */
export function getPlatform(): PwaPlatform {
    if (typeof navigator === 'undefined') return 'other';
    const ua = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua) ||
        // iPadOS 13+ reports as Mac but has touch
        ((navigator as any).platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1);
    if (isIOS) return 'ios';
    if (/Android/.test(ua)) return 'android';
    if (/Windows|Macintosh|Linux|CrOS/.test(ua)) return 'desktop';
    return 'other';
}

/** True for iOS Safari, where there is no beforeinstallprompt — manual A2HS only. */
export function isIOSSafari(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    const isIOS = getPlatform() === 'ios';
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
    return isIOS && isSafari;
}

/**
 * Record an install-prompt interaction. Non-blocking and best-effort: a failure
 * (offline, backend down) never disrupts the UI.
 */
export async function recordPwaEvent(action: string, platform?: string): Promise<void> {
    try {
        const token = getAuthToken();
        if (!token) return;
        await fetch(`${API_BASE_URL}/pwa/events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ action, platform: platform || getPlatform() }),
            keepalive: true,
        });
    } catch {
        /* analytics is best-effort — swallow errors */
    }
}

export interface PwaInstallStatus {
    installed: boolean;
    dismissed: boolean;
    dismissedUntil: string | null;
}

/** Per-user install/dismissal state so the prompt can stay hidden across devices. */
export async function getPwaInstallStatus(): Promise<PwaInstallStatus | null> {
    try {
        const token = getAuthToken();
        if (!token) return null;
        const res = await fetch(`${API_BASE_URL}/pwa/status`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return null;
        return (await res.json()) as PwaInstallStatus;
    } catch {
        return null;
    }
}

// Get network information (for showing data usage warnings)
export function getNetworkInfo() {
    if (typeof window === 'undefined' || !('connection' in navigator)) {
        return { effectiveType: 'unknown', saveData: false };
    }

    const connection = (navigator as any).connection;
    return {
        effectiveType: connection?.effectiveType || 'unknown',
        saveData: connection?.saveData || false,
        downlink: connection?.downlink || null,
        rtt: connection?.rtt || null
    };
}
