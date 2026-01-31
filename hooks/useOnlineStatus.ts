/**
 * useOnlineStatus Hook
 * 
 * React hook that tracks online/offline status
 */

import { useState, useEffect } from 'react';
import { networkManager } from '../lib/networkManager';

export function useOnlineStatus(): boolean {
    const [isOnline, setIsOnline] = useState(networkManager.isOnline());

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        networkManager.on('online', handleOnline);
        networkManager.on('offline', handleOffline);

        return () => {
            networkManager.off('online', handleOnline);
            networkManager.off('offline', handleOffline);
        };
    }, []);

    return isOnline;
}
