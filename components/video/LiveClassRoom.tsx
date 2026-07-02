import React from 'react';
import { createPortal } from 'react-dom';

interface LiveClassRoomProps {
    sessionId: string;
    displayName: string;
    subject?: string;
    topic?: string;
    /** Label for the exit button — e.g. "End Class" (teacher) or "Leave Class" (student). */
    actionLabel?: string;
    onExit: () => void;
}

// IMPORTANT — Jitsi must open in a new browser tab, NOT in an iframe.
// meet.jit.si detects any iframe embedding (not just External API) and shows
// "call will disconnect in 5 minutes". Opening a named window avoids this
// entirely. The named target means repeated "Reopen" clicks reuse the same tab.
export const buildJitsiUrl = (sessionId: string, displayName: string): string => {
    const room = `OliskeyClass${sessionId.replace(/-/g, '')}`;
    const name = encodeURIComponent(`"${displayName || 'Participant'}"`);
    return (
        `https://meet.jit.si/${room}` +
        `#userInfo.displayName=${name}` +
        `&config.prejoinPageEnabled=false` +
        `&config.prejoinConfig.enabled=false` +
        `&config.startAsModerator=true` +
        `&config.disableVirtualBackground=true` +
        `&config.startWithAudioMuted=false` +
        `&config.startWithVideoMuted=false`
    );
};

const LiveClassRoom: React.FC<LiveClassRoomProps> = ({
    sessionId, displayName, subject, topic, actionLabel = 'Leave Class', onExit,
}) => {
    const jitsiUrl = buildJitsiUrl(sessionId, displayName);
    const windowName = `jitsi_${sessionId.replace(/-/g, '')}`;

    const handleReopen = () => {
        window.open(jitsiUrl, windowName);
    };

    return createPortal(
        <div className="fixed inset-0 bg-slate-900 z-[9999] flex flex-col items-center justify-center text-white px-4">
            {/* Live indicator */}
            <div className="flex items-center space-x-2 mb-6">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <span className="text-red-400 font-bold text-sm uppercase tracking-widest">Live</span>
            </div>

            {/* Class info */}
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-1 text-center">
                {subject || 'Live Class'}
            </h2>
            {topic && (
                <p className="text-slate-400 text-base mb-8 text-center">{topic}</p>
            )}

            {/* Status */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl px-6 py-4 mb-8 text-center max-w-sm">
                <p className="text-slate-300 text-sm">
                    Your class room is open in another browser tab.
                    <br />
                    Switch to that tab to see the video call.
                </p>
            </div>

            {/* Actions */}
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

export default LiveClassRoom;
