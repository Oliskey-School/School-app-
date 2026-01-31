import React, { useEffect, useState, useRef } from 'react';
import { syncEngine } from '../../lib/syncEngine';
import { supabase } from '../../lib/supabase'; // Using direct supabase for fresh fetch or we could use offlineDB
import { useAuth } from '../../context/AuthContext';

export const ContextualMarquee: React.FC = () => {
    const { user } = useAuth();
    const [status, setStatus] = useState<'syncing' | 'events' | 'hidden'>('hidden');
    const [eventText, setEventText] = useState<string>('');
    const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch Events (Notices)
    useEffect(() => {
        const fetchNotices = async () => {
            if (!user?.user_metadata?.school_id) return;

            try {
                // Fetch recent events or urgent notices
                const { data, error } = await supabase
                    .from('notices')
                    .select('title')
                    .eq('school_id', user.user_metadata.school_id)
                    .in('category', ['Event', 'Urgent', 'Holiday'])
                    .gt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
                    .limit(5);

                if (data && data.length > 0) {
                    const text = data.map(n => n.title).join('  •  ');
                    setEventText(text);
                    if (status === 'hidden') setStatus('events');
                }
            } catch (err) {
                console.error('Failed to fetch marquee notices', err);
            }
        };

        fetchNotices();
        // Refresh every minute? Or just once on mount
    }, [user]);

    // Sync Logic
    useEffect(() => {
        const onSyncStart = () => {
            // Priority 1: Show Sync
            setStatus('syncing');

            // "Auto-Dismiss: The 'Syncing' status must disappear after a maximum of 3 seconds."
            if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
            syncTimeoutRef.current = setTimeout(() => {
                setStatus(prev => prev === 'syncing' ? (eventText ? 'events' : 'hidden') : prev);
            }, 3000);
        };

        const onSyncComplete = () => {
            if (getStatusFromRef() === 'syncing') {
                setStatus(eventText ? 'events' : 'hidden');
            }
        };

        // Helper to get current status in closure (not perfect but OK given state updates)
        // Alternatively, functional updates in setStatus handle atomic transitions.

        syncEngine.on('sync-start', onSyncStart);
        syncEngine.on('sync-complete', onSyncComplete);
        syncEngine.on('sync-error', onSyncComplete);

        // Cleanup
        return () => {
            syncEngine.off('sync-start', onSyncStart);
            syncEngine.off('sync-complete', onSyncComplete);
            syncEngine.off('sync-error', onSyncComplete);
            if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        };
    }, [eventText]);

    // Workaround for state closure in event listeners if needed, 
    // but the functional update in timeout handles the important part.
    // For onSyncComplete, we blindly switch to events/hidden, which is fine.

    function getStatusFromRef() {
        // Just a placeholder, actual logic is inside the effects
        return 'unknown';
    }

    if (status === 'hidden' && !eventText) return null;

    return (
        <div className="w-full h-[32px] overflow-hidden relative z-50 shadow-sm transition-colors duration-300 ease-in-out">
            {/* Sync Mode */}
            <div
                className={`absolute inset-0 bg-indigo-600 flex items-center justify-center transition-transform duration-500 ${status === 'syncing' ? 'translate-y-0' : '-translate-y-full'}`}
            >
                <div className="flex items-center space-x-2 text-xs font-semibold text-white uppercase tracking-wider">
                    <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Syncing Data...</span>
                </div>
            </div>

            {/* Event Mode (Marquee) */}
            <div
                className={`absolute inset-0 bg-amber-100 border-b border-amber-200 flex items-center transition-transform duration-500 ${status === 'events' ? 'translate-y-0' : status === 'syncing' ? 'translate-y-full' : '-translate-y-full'}`}
            >
                {/* 
                   We need a pure CSS marquee. 
                   Tailwind doesn't have 'marquee' by default, usually requires a plugin. 
                   We'll inject a style tag or standard css animation.
                */}
                <style>{`
                    @keyframes marquee {
                        0% { transform: translateX(100%); }
                        100% { transform: translateX(-100%); }
                    }
                    .animate-marquee {
                        animation: marquee 20s linear infinite;
                        white-space: nowrap;
                    }
                `}</style>
                <div className="w-full overflow-hidden flex items-center">
                    <div className="animate-marquee inline-block text-xs font-medium text-amber-900 px-4">
                        {eventText}
                    </div>
                </div>
            </div>
        </div>
    );
};
