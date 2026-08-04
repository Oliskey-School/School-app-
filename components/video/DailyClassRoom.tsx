import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import DailyIframe, { DailyCall } from '@daily-co/daily-js';
import { api } from '../../lib/api';

interface DailyClassRoomProps {
    sessionId: string;
    displayName: string;
    subject?: string;
    topic?: string;
    /** e.g. "End Class" (teacher) or "Leave Class" (student). */
    actionLabel?: string;
    onExit: () => void;
}

/**
 * Live class over Daily.co, embedded directly in the app.
 *
 * Unlike the public meet.jit.si path this replaces, Daily is built for
 * embedding: no 5-minute cutoff and no "waiting for a moderator to log in"
 * gate, so the call actually runs inside the app.
 *
 * The room URL comes from our own backend (POST /api/video/room) because
 * Daily's API key must never reach the browser.
 */
const DailyClassRoom: React.FC<DailyClassRoomProps> = ({
    sessionId, displayName, subject, topic, actionLabel = 'Leave Class', onExit,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const callRef = useRef<DailyCall | null>(null);
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const room = await api.createVideoRoom(sessionId);
                if (cancelled || !containerRef.current) return;

                const call = DailyIframe.createFrame(containerRef.current, {
                    iframeStyle: { width: '100%', height: '100%', border: '0' },
                    showLeaveButton: false, // we render our own, so exit always returns into the app
                });
                callRef.current = call;

                // Leaving from inside Daily's UI must also exit this screen,
                // otherwise the user is stranded on a dead embed.
                call.on('left-meeting', () => { if (!cancelled) onExit(); });

                await call.join({ url: room.url, userName: displayName || 'Participant' });
                if (!cancelled) setStatus('ready');
            } catch (err: any) {
                if (cancelled) return;
                setErrorMessage(err?.message || 'Could not connect to the class room.');
                setStatus('error');
            }
        })();

        return () => {
            cancelled = true;
            callRef.current?.destroy();
            callRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId]);

    const handleExit = async () => {
        try { await callRef.current?.leave(); } catch { /* leaving is best-effort */ }
        onExit();
    };

    return createPortal(
        <div className="fixed inset-0 bg-slate-900 z-[9999] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-red-400 font-bold text-xs uppercase tracking-widest">Live</span>
                    </div>
                    <div className="min-w-0">
                        <p className="text-white font-bold text-sm truncate">{subject || 'Live Class'}</p>
                        {topic && <p className="text-slate-400 text-xs truncate">{topic}</p>}
                    </div>
                </div>
                <button
                    onClick={handleExit}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition-all active:scale-95 shrink-0"
                >
                    {actionLabel}
                </button>
            </div>

            <div className="relative flex-1 min-h-0">
                {status === 'loading' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3">
                        <div className="w-8 h-8 border-4 border-slate-600 border-t-indigo-500 rounded-full animate-spin" />
                        <p className="text-slate-400 text-sm">Connecting to class...</p>
                    </div>
                )}
                {status === 'error' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-4 px-6 text-center">
                        <p className="text-slate-300 font-bold">Could not join the class room</p>
                        <p className="text-slate-500 text-sm max-w-sm">{errorMessage}</p>
                        <button
                            onClick={onExit}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold transition-all active:scale-95"
                        >
                            Go Back
                        </button>
                    </div>
                )}
                <div ref={containerRef} className="w-full h-full" />
            </div>
        </div>,
        document.body
    );
};

export default DailyClassRoom;
