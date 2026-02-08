import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { VideoIcon, XIcon, CheckIcon } from '../../constants';

interface IncomingClassModalProps {
    isOpen: boolean;
    classInfo: {
        teacherName: string;
        subject: string;
        topic?: string;
        meetingLink?: string; // Or sessionId if handled internally
        sessionId?: string;
        startTime?: string;
    } | null;
    onJoin: () => void;
    onDecline: () => void;
}

const IncomingClassModal: React.FC<IncomingClassModalProps> = ({ isOpen, classInfo, onJoin, onDecline }) => {
    const [ringtoneAudio] = useState(new Audio('/sounds/incoming_class_ringtone.mp3')); // Placeholder sound path
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Initial render: Check if document body exists (standard react portal practice)
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    useEffect(() => {
        if (isOpen) {
            // Play ringtone loop
            // Note: Browsers might block auto-play if no interaction.
            // We'll try to play.
            try {
                // Determine source for sound - assuming a standard asset or base64 if needed.
                // For now, let's assume valid path or silent fallback.
                // ringtoneAudio.loop = true;
                // ringtoneAudio.play().catch(e => console.log("Audio play blocked", e));
            } catch (e) {
                console.error("Audio setup failed");
            }
        } else {
            // ringtoneAudio.pause();
            // ringtoneAudio.currentTime = 0;
        }
    }, [isOpen, ringtoneAudio]);

    if (!mounted || !isOpen || !classInfo) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-sm transition-opacity duration-300">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-1 overflow-hidden animate-bounce-subtle transform scale-100 transition-all">
                <div className="relative p-8 flex flex-col items-center justify-center text-center space-y-6 bg-gradient-to-b from-indigo-50 to-white dark:from-slate-700 dark:to-slate-800 rounded-3xl">

                    {/* Pulsing Avatar/Icon */}
                    <div className="relative">
                        <div className="absolute inset-0 bg-indigo-500 rounded-full opacity-20 animate-ping"></div>
                        <div className="relative w-24 h-24 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-full flex items-center justify-center shadow-xl ring-4 ring-white dark:ring-slate-700">
                            <VideoIcon className="w-10 h-10 text-white animate-pulse" />
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full border-2 border-white dark:border-slate-800 shadow-sm flex items-center gap-1">
                            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                            LIVE
                        </div>
                    </div>

                    {/* Text Info */}
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                            Incoming Class
                        </h2>
                        <div className="space-y-1">
                            <p className="text-lg font-medium text-indigo-600 dark:text-indigo-400">
                                {classInfo.subject}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {classInfo.teacherName} is starting a session
                            </p>
                            {classInfo.topic && (
                                <p className="text-xs inline-block bg-gray-100 dark:bg-slate-700 px-3 py-1 rounded-full text-gray-600 dark:text-gray-300 mt-2">
                                    Topic: {classInfo.topic}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-4 w-full mt-4">
                        <button
                            onClick={onDecline}
                            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors active:scale-95 group"
                        >
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mb-2 group-hover:bg-red-200">
                                <XIcon className="w-6 h-6" />
                            </div>
                            <span className="font-semibold text-sm">Decline</span>
                        </button>

                        <button
                            onClick={onJoin}
                            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-green-50 text-green-600 hover:bg-green-100 transition-colors active:scale-95 group shadow-sm border border-green-100"
                        >
                            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center mb-2 shadow-lg shadow-green-200 group-hover:scale-110 transition-transform">
                                <VideoIcon className="w-5 h-5 text-white" />
                            </div>
                            <span className="font-bold text-sm">Join Now</span>
                        </button>
                    </div>

                </div>
            </div>

            {/* Backdrop animation style */}
            <style>{`
                @keyframes bounce-subtle {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.02); }
                }
                .animate-bounce-subtle {
                    animation: bounce-subtle 2s infinite ease-in-out;
                }
            `}</style>
        </div>,
        document.body
    );
};

export default IncomingClassModal;
