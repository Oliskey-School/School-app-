import React, { useEffect, useState } from 'react';

interface OfflineIndicatorProps {
    className?: string;
}

export function OfflineIndicator({ className = '' }: OfflineIndicatorProps) {
    const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const [showReconnected, setShowReconnected] = useState(false);

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

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Show reconnected message
    if (showReconnected) {
        return (
            <div className={`fixed top-0 left-0 right-0 z-50 ${className}`}>
                <div className="bg-green-500 text-white px-4 py-3 text-center font-medium shadow-lg animate-slide-down">
                    <div className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>✓ Back Online - Syncing your data...</span>
                    </div>
                </div>
            </div>
        );
    }

    // Show offline indicator
    if (!isOnline) {
        return (
            <div className={`fixed top-0 left-0 right-0 z-50 ${className}`}>
                <div className="bg-yellow-500 text-white px-4 py-3 text-center font-medium shadow-lg">
                    <div className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span>⚠ You're Offline - Changes will sync when connected</span>
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
