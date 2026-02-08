import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

/**
 * Network status hook
 * Monitors online/offline state and shows notifications
 */
export function useNetworkStatus() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [wasOffline, setWasOffline] = useState(false);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);

            if (wasOffline) {
                toast.success('🔄 Back online - syncing data...', {
                    duration: 3000,
                    icon: '✅'
                });
            }

            setWasOffline(false);
        };

        const handleOffline = () => {
            setIsOnline(false);
            setWasOffline(true);

            toast.error('⚠️ You are offline. Changes will sync when connection is restored.', {
                duration: Infinity,
                id: 'offline-status'
            });
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            toast.dismiss('offline-status');
        };
    }, [wasOffline]);

    return { isOnline, wasOffline };
}
