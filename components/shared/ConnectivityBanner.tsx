import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';

// Hook to check online status (re-implemented for self-containment or can be imported)
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

export default function ConnectivityBanner() {
    const isOnline = useOnlineStatus();
    const [showReconnectedToast, setShowReconnectedToast] = useState(false);

    // Track previous online state to detect reconnection
    const [wasOffline, setWasOffline] = useState(false);

    useEffect(() => {
        if (!isOnline) {
            setWasOffline(true);
        } else if (wasOffline && isOnline) {
            // Reconnection detected
            setShowReconnectedToast(true);
            setWasOffline(false); // Reset

            // Auto-dismiss after 4 seconds
            const timer = setTimeout(() => {
                setShowReconnectedToast(false);
            }, 4000);

            return () => clearTimeout(timer);
        }
    }, [isOnline, wasOffline]);

    return (
        <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
            <AnimatePresence>
                {/* Offline Warning - Subtle Persistent Indicator */}
                {!isOnline && (
                    <motion.div
                        initial={{ y: -50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -50, opacity: 0 }}
                        className="mt-2"
                    >
                        <div className="bg-gray-900/90 backdrop-blur-sm text-gray-200 px-4 py-1.5 rounded-full shadow-lg border border-gray-700/50 flex items-center gap-2 text-sm font-medium pointer-events-auto">
                            <WifiOff className="w-4 h-4 text-gray-400" />
                            <span>You are offline</span>
                            <span className="w-1 h-1 bg-gray-500 rounded-full mx-1"></span>
                            <span className="text-xs text-gray-400">Viewing cached data</span>
                        </div>
                    </motion.div>
                )}

                {/* Reconnection Toast - "Synchronizing..." */}
                {showReconnectedToast && (
                    <motion.div
                        initial={{ y: -50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -50, opacity: 0 }}
                        className="mt-2 absolute"
                    >
                        <div className="bg-blue-600/90 backdrop-blur-sm text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-3 text-sm font-medium pointer-events-auto">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Synchronizing data...</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
