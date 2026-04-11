import React, { useEffect, useState, useRef } from 'react';
import { syncEngine } from '../../lib/syncEngine';
import { api } from '../../lib/api'; 
import { useAuth } from '../../context/AuthContext';

const ContextualMarquee: React.FC = () => {
    const { user, currentSchool } = useAuth();
    const [status, setStatus] = useState<'syncing' | 'events' | 'hidden'>('hidden');
    const [eventText, setEventText] = useState<string>('');
    const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch Events (Notices)
    useEffect(() => {
        const fetchNotices = async () => {
            const schoolId = user?.user_metadata?.school_id || currentSchool?.id;
            if (!schoolId) return;

            try {
                // Fetch recent events or urgent notices via custom API
                const data = await api.getNotices(schoolId);

                if (data && data.length > 0) {
                    // Filter for relevant categories manually if API doesn't support it yet
                    const filtered = data.filter((n: any) => 
                        ['Event', 'Urgent', 'Holiday'].includes(n.category)
                    ).slice(0, 5);

                    if (filtered.length > 0) {
                        const text = filtered.map((n: any) => n.title).join('  •  ');
                        setEventText(text);
                        if (status === 'hidden') setStatus('events');
                    }
                }
            } catch (err) {
                console.error('Failed to fetch marquee notices', err);
            }
        };

        fetchNotices();
    }, [user, currentSchool]);

    // Sync Logic
    useEffect(() => {
        const onSyncStart = () => {
            setStatus('syncing');

            if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
            syncTimeoutRef.current = setTimeout(() => {
                setStatus(prev => prev === 'syncing' ? (eventText ? 'events' : 'hidden') : prev);
            }, 3000);
        };

        const onSyncComplete = () => {
            setStatus(eventText ? 'events' : 'hidden');
        };

        syncEngine.on('sync-start', onSyncStart);
        syncEngine.on('sync-complete', onSyncComplete);
        syncEngine.on('sync-error', onSyncComplete);

        return () => {
            syncEngine.off('sync-start', onSyncStart);
            syncEngine.off('sync-complete', onSyncComplete);
            syncEngine.off('sync-error', onSyncComplete);
            if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        };
    }, [eventText]);

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

export default ContextualMarquee;
