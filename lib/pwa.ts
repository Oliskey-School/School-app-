/**
 * PWA Installation and Service Worker Registration
 * Handles PWA install prompts and service worker lifecycle
 */

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Register service worker - MODIFIED FOR DEV DEBUGGING TO UNREGISTER
export function registerServiceWorker() {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        return;
    }

    // FORCE UNREGISTER FOR DEVELOPMENT DEBUGGING
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
