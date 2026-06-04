import React from 'react';

/**
 * One shared live video room used by BOTH the teacher and students. Because the
 * room name is derived from the same session id, everyone lands in the SAME
 * Jitsi room and can see/hear/chat with each other. Camera, microphone, screen
 * share, chat, raise-hand and reactions are all standard Jitsi toolbar features.
 */
interface LiveClassRoomProps {
    sessionId: string;
    displayName: string;
    subject?: string;
    topic?: string;
    /** Label for the exit button — e.g. "End Class" (teacher) or "Leave Class" (student). */
    actionLabel?: string;
    onExit: () => void;
}

const LiveClassRoom: React.FC<LiveClassRoomProps> = ({
    sessionId, displayName, subject, topic, actionLabel = 'Leave Class', onExit,
}) => {
    // MUST match the student/teacher on both sides — keyed purely by session id.
    const room = `OliskeyClass_${sessionId}`;
    const name = encodeURIComponent(`"${displayName || 'Participant'}"`);
    // Skip the pre-join lobby and carry the participant's display name in.
    const jitsiUrl =
        `https://meet.jit.si/${room}` +
        `#userInfo.displayName=${name}` +
        `&config.prejoinPageEnabled=false` +
        `&config.prejoinConfig.enabled=false`;

    return (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col">
            <div className="flex items-center justify-between bg-slate-900 text-white p-4 border-b border-slate-800">
                <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0"></div>
                    <h2 className="font-bold text-lg truncate">{subject || 'Live Class'}</h2>
                    {topic && <span className="text-slate-400 text-sm hidden md:inline truncate">| {topic}</span>}
                </div>
                <button
                    onClick={onExit}
                    className="px-6 py-2 bg-red-600 rounded-xl hover:bg-red-700 font-bold transition-all active:scale-95 shadow-lg shadow-red-900/20 flex-shrink-0"
                >
                    {actionLabel}
                </button>
            </div>
            <iframe
                src={jitsiUrl}
                allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
                className="w-full flex-1"
                title="Live Class Room"
            />
        </div>
    );
};

export default LiveClassRoom;
