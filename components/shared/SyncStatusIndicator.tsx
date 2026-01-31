/**
 * Sync Status Indicator Component
 * 
 * Displays current sync status with visual indicators for:
 * - Syncing state with spinner
 * - Synced state with checkmark
 * - Error state with warning
 * - Pending operations count
 * - Manual sync button
 */

import React from 'react';
import { useSyncStatus } from '../../hooks/useOfflineQuery';
import { useOnlineStatus } from '../../components/shared/OfflineIndicator';
import { useNetworkStatus } from '../../lib/networkManager';

export function SyncStatusIndicator() {
    const syncStatus = useSyncStatus();
    const isOnline = useOnlineStatus();

    const { isSyncing, pendingOperations, lastSync, status, triggerSync } = syncStatus;

    // Don't show if no pending operations and synced < 5 seconds ago
    const recentlysynced = lastSync > 0 && (Date.now() - lastSync) < 5000;

    if (!isOnline) {
        // Show offline status
        return (
            <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg text-sm">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                <span className="text-yellow-700 dark:text-yellow-300 font-medium">
                    Offline
                </span>
                {pendingOperations > 0 && (
                    <span className="ml-auto text-xs text-yellow-600 dark:text-yellow-400">
                        {pendingOperations} pending
                    </span>
                )}
            </div>
        );
    }

    // Logic: Only show "Syncing..." if:
    // 1. Connection is POOR (not strong)
    // 2. OR We just reconnected (show for < 5s)
    const { quality, isGoodForSync } = useNetworkStatus();
    const [isReconnectedPromise, setIsReconnectedPromise] = React.useState(false);

    React.useEffect(() => {
        if (isOnline) {
            // We utilize a small delay to simulate "reconnected" state if needed, 
            // but here we just want to ensure we catch that transition.
            // Actually, the OfflineIndicator handles the "Back Online" toast.
            // The user specifically pointed to the "Syncing..." banner.

            // If we want to show it briefly on reconnect:
            setIsReconnectedPromise(true);
            const timer = setTimeout(() => setIsReconnectedPromise(false), 4000);
            return () => clearTimeout(timer);
        }
    }, [isOnline]);

    if (isSyncing) {
        // If connection is good and we are NOT in the "just reconnected" window, HIDE the syncing banner.
        if (isGoodForSync && !isReconnectedPromise) {
            return null;
        }

        return (
            <div className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm ${!isGoodForSync ? 'bg-orange-50 border-orange-200 text-orange-800' : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                }`}>
                <svg
                    className={`w-4 h-4 animate-spin ${!isGoodForSync ? 'text-orange-600' : 'text-blue-600 dark:text-blue-400'}`}
                    fill="none"
                    viewBox="0 0 24 24"
                >
                    <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                    />
                    <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                </svg>
                <span className={`font-medium ${!isGoodForSync ? 'text-orange-800' : 'text-blue-700 dark:text-blue-300'}`}>
                    {!isGoodForSync ? 'Syncing (Slow Network)...' : 'Syncing...'}
                </span>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-sm">
                <svg
                    className="w-4 h-4 text-red-600 dark:text-red-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                >
                    <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                    />
                </svg>
                <span className="text-red-700 dark:text-red-300 font-medium">
                    Sync Error
                </span>
                <button
                    onClick={triggerSync}
                    className="ml-auto text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 font-medium"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (recentlysynced || pendingOperations === 0) {
        return (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg text-sm">
                <svg
                    className="w-4 h-4 text-green-600 dark:text-green-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                >
                    <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                    />
                </svg>
                <span className="text-green-700 dark:text-green-300 font-medium">
                    Synced
                </span>
                {lastSync > 0 && (
                    <span className="ml-auto text-xs text-green-600 dark:text-green-400">
                        {formatLastSync(lastSync)}
                    </span>
                )}
            </div>
        );
    }

    // Has pending operations
    return (
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm">
            <div className="w-2 h-2 bg-gray-400 rounded-full" />
            <span className="text-gray-700 dark:text-gray-300 font-medium">
                {pendingOperations} pending
            </span>
            <button
                onClick={triggerSync}
                className="ml-auto px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
            >
                Sync Now
            </button>
        </div>
    );
}

/**
 * Compact sync status badge
 */
export function SyncStatusBadge() {
    const { isSyncing, pendingOperations, status } = useSyncStatus();
    const isOnline = useOnlineStatus();

    if (!isOnline && pendingOperations > 0) {
        return (
            <div className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-xs rounded-full">
                <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse" />
                <span>{pendingOperations}</span>
            </div>
        );
    }

    if (isSyncing) {
        return (
            <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Syncing</span>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded-full">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>Error</span>
            </div>
        );
    }

    return (
        <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Synced</span>
        </div>
    );
}

/**
 * Floating sync button
 */
// Floating sync button removed as per user request (Step 283)
export function FloatingSyncButton() {
    return null;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatLastSync(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 10) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}
