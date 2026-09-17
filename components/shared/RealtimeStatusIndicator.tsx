import React, { useEffect, useState } from 'react';
import { socketService, RealtimeStatus } from '../../lib/socketService';

// Real-time (the notification bell, live class alerts, attendance/grade
// updates appearing without a manual refresh) used to be able to fail
// completely with zero visible sign to the user — the browser's own
// online/offline state (OfflineIndicator) has no idea the WebSocket itself
// is down, since ordinary page loads and API calls keep working fine over
// plain HTTP. This surfaces that specific failure mode instead of leaving
// it invisible.
//
// Deliberately quiet: a normal reconnect (a laptop waking from sleep, a
// brief network blip) resolves within a couple of seconds and should never
// flash a banner. Only a connection that stays down for a while is worth
// interrupting the user for.
const SHOW_AFTER_MS = 8000;

export function RealtimeStatusIndicator({ className = '' }: { className?: string }) {
    const [status, setStatus] = useState<RealtimeStatus>(socketService.getStatus());
    const [showBanner, setShowBanner] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        return socketService.onStatusChange(setStatus);
    }, []);

    useEffect(() => {
        if (status === 'connected') {
            setShowBanner(false);
            setDismissed(false);
            return;
        }
        const timer = setTimeout(() => setShowBanner(true), SHOW_AFTER_MS);
        return () => clearTimeout(timer);
    }, [status]);

    if (!showBanner || dismissed) return null;

    return (
        <div className={`fixed top-0 left-0 right-0 z-[60] ${className}`}>
            <div className="bg-orange-500 text-white px-4 py-2 text-center text-sm font-medium shadow-lg transition-all duration-300">
                <div className="flex items-center justify-center gap-2 relative">
                    <svg className="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.367zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                    </svg>
                    <span>Live updates unavailable — reconnecting…</span>
                    <button
                        onClick={() => setDismissed(true)}
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
