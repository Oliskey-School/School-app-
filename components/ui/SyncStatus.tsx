import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { offlineDB } from '../../lib/dexie-db';

export const SyncStatus: React.FC = () => {
    const isOnline = useOnlineStatus();
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncCount, setLastSyncCount] = useState(0);
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        const handleSyncStart = () => setIsSyncing(true);
        const handleSyncComplete = (e: any) => {
            setIsSyncing(false);
            if (e.detail?.count > 0) {
                setLastSyncCount(e.detail.count);
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 3000);
            }
        };

        window.addEventListener('sync-start', handleSyncStart);
        window.addEventListener('sync-complete', handleSyncComplete);

        return () => {
            window.removeEventListener('sync-start', handleSyncStart);
            window.removeEventListener('sync-complete', handleSyncComplete);
        };
    }, []);

    return (
        <div className="fixed top-0 left-0 right-0 z-[100] pointer-events-none flex justify-center pt-2">
            <AnimatePresence mode="wait">
                {showSuccess ? (
                    <motion.div 
                        initial={{ y: -50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -50, opacity: 0 }}
                        className="bg-emerald-600 text-white px-4 py-1.5 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium"
                    >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>✅ {lastSyncCount} actions synced</span>
                    </motion.div>
                ) : (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`px-4 py-1 rounded-full shadow-md flex items-center gap-3 text-xs font-bold border transition-colors ${
                            isOnline ? 'bg-white/90 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'
                        }`}
                    >
                        <div className="flex items-center gap-1.5">
                            {isOnline ? (
                                <Wifi className="w-3.5 h-3.5" />
                            ) : (
                                <WifiOff className="w-3.5 h-3.5" />
                            )}
                            <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
                        </div>

                        {isSyncing && (
                            <div className="flex items-center gap-1.5 border-l border-current pl-3 animate-pulse">
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                <span>SYNCING...</span>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
