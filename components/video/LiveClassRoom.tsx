import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { JITSI_DOMAIN, getVideoProvider } from '../../lib/videoConfig';
import DailyClassRoom from './DailyClassRoom';

interface LiveClassRoomProps {
    sessionId: string;
    displayName: string;
    subject?: string;
    topic?: string;
    /** Label for the exit button — e.g. "End Class" (teacher) or "Leave Class" (student). */
    actionLabel?: string;
    onExit: () => void;
}

const roomNameFor = (sessionId: string) => `OliskeyClass${sessionId.replace(/-/g, '')}`;

// IMPORTANT — the free public meet.jit.si must open in a new browser tab, NOT
// in an iframe. It detects any iframe embedding (not just External API) and
// disconnects the call after 5 minutes ("for demonstration purposes only") —
// a deliberate anti-embedding policy Jitsi added in 2023, confirmed against
// their own community announcement, not something any client-side fix can
// bypass. Opening a named window avoids it entirely; the named target means
// repeated "Reopen" clicks reuse the same tab. Once a self-hosted (or JaaS)
// domain is configured via VITE_JITSI_DOMAIN, this restriction doesn't apply
// and the call embeds directly in-app instead — see the embedded branch below.
export const buildJitsiUrl = (sessionId: string, displayName: string): string => {
    const room = roomNameFor(sessionId);
    const name = encodeURIComponent(`"${displayName || 'Participant'}"`);
    return (
        `https://${JITSI_DOMAIN}/${room}` +
        `#userInfo.displayName=${name}` +
        `&config.prejoinPageEnabled=false` +
        `&config.prejoinConfig.enabled=false` +
        `&config.startAsModerator=true` +
        `&config.disableVirtualBackground=true` +
        `&config.startWithAudioMuted=false` +
        `&config.startWithVideoMuted=false`
    );
};

// Loads https://{domain}/external_api.js once and caches the promise so
// multiple LiveClassRoom mounts (e.g. re-joining) don't re-fetch the script.
let externalApiPromise: Promise<any> | null = null;
const loadJitsiExternalApi = (domain: string): Promise<any> => {
    if ((window as any).JitsiMeetExternalAPI) return Promise.resolve((window as any).JitsiMeetExternalAPI);
    if (externalApiPromise) return externalApiPromise;
    externalApiPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `https://${domain}/external_api.js`;
        script.async = true;
        script.onload = () => resolve((window as any).JitsiMeetExternalAPI);
        script.onerror = () => { externalApiPromise = null; reject(new Error('Failed to load Jitsi External API')); };
        document.body.appendChild(script);
    });
    return externalApiPromise;
};

// Embedded, self-hosted call — renders the real video call inline via
// Jitsi's official IFrame API (JitsiMeetExternalAPI), not a raw <iframe src>,
// so hangup/leave events are handled properly instead of just showing a link.
const EmbeddedClassRoom: React.FC<LiveClassRoomProps> = ({
    sessionId, displayName, actionLabel = 'Leave Class', onExit,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const apiRef = useRef<any>(null);
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

    useEffect(() => {
        let cancelled = false;

        loadJitsiExternalApi(JITSI_DOMAIN)
            .then((JitsiMeetExternalAPI) => {
                if (cancelled || !containerRef.current) return;
                const api = new JitsiMeetExternalAPI(JITSI_DOMAIN, {
                    roomName: roomNameFor(sessionId),
                    parentNode: containerRef.current,
                    userInfo: { displayName: displayName || 'Participant' },
                    width: '100%',
                    height: '100%',
                    configOverwrite: {
                        prejoinPageEnabled: false,
                        startWithAudioMuted: false,
                        startWithVideoMuted: false,
                        disableVirtualBackground: true,
                    },
                    interfaceConfigOverwrite: {
                        TOOLBAR_BUTTONS: [
                            'microphone', 'camera', 'desktop', 'chat', 'raisehand',
                            'tileview', 'hangup', 'fullscreen',
                        ],
                    },
                });
                apiRef.current = api;

                // The user hanging up from Jitsi's own in-call toolbar should exit
                // this screen too, not just close the embedded frame.
                api.addListener('readyToClose', () => onExit());
                api.addListener('videoConferenceLeft', () => onExit());

                setStatus('ready');
            })
            .catch(() => { if (!cancelled) setStatus('error'); });

        return () => {
            cancelled = true;
            apiRef.current?.dispose();
            apiRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId]);

    const handleEndOrLeave = () => {
        if (apiRef.current) {
            apiRef.current.executeCommand('hangup');
        } else {
            onExit();
        }
    };

    return createPortal(
        <div className="fixed inset-0 bg-slate-900 z-[9999] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-red-400 font-bold text-xs uppercase tracking-widest">Live</span>
                </div>
                <button
                    onClick={handleEndOrLeave}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition-all active:scale-95"
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
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-4 px-4 text-center">
                        <p className="text-slate-300">Could not connect to the class room.</p>
                        <button onClick={onExit} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold transition-all active:scale-95">
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

// Legacy fallback — the free public Jitsi server, opened in a separate tab
// (see the comment on buildJitsiUrl above for why embedding it doesn't work).
const NewTabClassRoom: React.FC<LiveClassRoomProps> = ({
    sessionId, displayName, subject, topic, actionLabel = 'Leave Class', onExit,
}) => {
    const jitsiUrl = buildJitsiUrl(sessionId, displayName);
    const windowName = `jitsi_${sessionId.replace(/-/g, '')}`;

    const handleReopen = () => {
        window.open(jitsiUrl, windowName);
    };

    return createPortal(
        <div className="fixed inset-0 bg-slate-900 z-[9999] flex flex-col items-center justify-center text-white px-4">
            <div className="flex items-center space-x-2 mb-6">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <span className="text-red-400 font-bold text-sm uppercase tracking-widest">Live</span>
            </div>

            <h2 className="text-2xl md:text-3xl font-bold text-white mb-1 text-center">
                {subject || 'Live Class'}
            </h2>
            {topic && (
                <p className="text-slate-400 text-base mb-8 text-center">{topic}</p>
            )}

            <div className="bg-slate-800 border border-slate-700 rounded-2xl px-6 py-4 mb-8 text-center max-w-sm">
                <p className="text-slate-300 text-sm">
                    Your class room is open in another browser tab.
                    <br />
                    Switch to that tab to see the video call.
                </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs">
                <button
                    onClick={handleReopen}
                    className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-indigo-900/30"
                >
                    Reopen Class Room
                </button>
                <button
                    onClick={onExit}
                    className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-red-900/30"
                >
                    {actionLabel}
                </button>
            </div>
        </div>,
        document.body
    );
};

// Routes to whichever provider is configured — see lib/videoConfig.ts.
// Both 'daily' and 'jitsi-selfhosted' run the call inside the app; only the
// legacy public-Jitsi fallback still punts to a separate browser tab.
const LiveClassRoom: React.FC<LiveClassRoomProps> = (props) => {
    switch (getVideoProvider()) {
        case 'daily':
            return <DailyClassRoom {...props} />;
        case 'jitsi-selfhosted':
            return <EmbeddedClassRoom {...props} />;
        default:
            return <NewTabClassRoom {...props} />;
    }
};

export default LiveClassRoom;
