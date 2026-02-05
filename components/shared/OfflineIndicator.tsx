import React, { useEffect, useState } from 'react';
import { networkManager, ConnectionQuality } from '../../lib/networkManager';
import { syncEngine } from '../../lib/syncEngine';

interface OfflineIndicatorProps {
    className?: string;
}

export function OfflineIndicator({ className = '' }: OfflineIndicatorProps) {
    const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const [showReconnected, setShowReconnected] = useState(false);
    const [quality, setQuality] = useState<ConnectionQuality>(ConnectionQuality.UNKNOWN);
    const [pendingCount, setPendingCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setShowReconnected(true);

            // Hide "reconnected" message after 3 seconds
            setTimeout(() => {
                setShowReconnected(false);
            }, 3000);
        };

        const handleOffline = () => {
            setIsOnline(false);
            setShowReconnected(false);
        };

        const handleNetworkStateChange = (state: any) => {
            setQuality(state.quality);
        };

        const handleSyncStateChange = (state: any) => {
            setPendingCount(state.pendingOperations);
            setIsSyncing(state.status === 'syncing');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        networkManager.on('state-change', handleNetworkStateChange);
        syncEngine.on('state-change', handleSyncStateChange);

        // Initial state
        setQuality(networkManager.getQuality());
        syncEngine.getPendingCount().then(setPendingCount);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            networkManager.off('state-change', handleNetworkStateChange);
            syncEngine.off('state-change', handleSyncStateChange);
        };
    }, []);

    const handleManualSync = async () => {
        await syncEngine.triggerSync();
    };

    const [isSlowDismissed, setIsSlowDismissed] = useState(false);

    // Reset dismissal when quality improves
    useEffect(() => {
        if (quality !== ConnectionQuality.POOR && quality !== ConnectionQuality.FAIR) {
            setIsSlowDismissed(false);
        }
    }, [quality]);

    // Show reconnected message
    if (showReconnected) {
        return (
            <div className={`fixed top-0 left-0 right-0 z-[60] ${className}`}>
                <div className="bg-green-500 text-white px-4 py-3 text-center font-medium shadow-lg animate-slide-down">
                    <div className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>✓ Back Online - Syncing your data...</span>
                        {isSyncing && (
                            <svg className="w-4 h-4 animate-spin ml-2" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Show offline indicator
    if (!isOnline) {
        return (
            <div className={`fixed top-0 left-0 right-0 z-[60] ${className}`}>
                <div className="bg-yellow-500 text-white px-4 py-3 text-center font-medium shadow-lg">
                    <div className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span>⚠ You're Offline</span>
                        {pendingCount > 0 && (
                            <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-sm">
                                {pendingCount} pending change{pendingCount > 1 ? 's' : ''}
                            </span>
                        )}
                    </div>
                    <p className="text-xs mt-1 opacity-90">
                        Changes will sync when you reconnect
                    </p>
                </div>
            </div>
        );
    }

    // Show poor connection warning - Only for POOR quality (very very bad)
    // Removed FAIR from triggering the banner to reduce frequency as requested
    if (quality === ConnectionQuality.POOR && !isSlowDismissed) {
        return (
            <div className={`fixed top-0 left-0 right-0 z-[60] ${className}`}>
                <div className="bg-orange-500 text-white px-4 py-2 text-center text-sm font-medium shadow-lg transition-all duration-300">
                    <div className="flex items-center justify-center gap-2 relative">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                        </svg>
                        <span>Slow Connection - Sync may be delayed</span>
                        {pendingCount > 0 && (
                            <button
                                onClick={handleManualSync}
                                className="ml-2 px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded text-xs transition-colors"
                                disabled={isSyncing}
                            >
                                {isSyncing ? 'Syncing...' : `Sync ${pendingCount} now`}
                            </button>
                        )}
                        <button
                            onClick={() => setIsSlowDismissed(true)}
                            className="absolute right-0 p-1 hover:bg-black/10 rounded-full transition-colors"
                            aria-label="Dismiss"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}

// Hook to check online status
export function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return isOnline;
}

