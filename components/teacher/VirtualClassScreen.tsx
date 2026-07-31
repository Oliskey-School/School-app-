import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import {
    MicrophoneIcon,
    VideoIcon,
    ShareIcon,
    UsersIcon,
    MessagesIcon,
    ChevronDownIcon,
} from '../../constants';

import api from '../../lib/api';
import { useTeacherClasses } from '../../hooks/useTeacherClasses';
import { getFormattedClassName } from '../../constants';
import { parseClassName } from '../../utils/classUtils';
import LiveClassRoom, { buildJitsiUrl } from '../video/LiveClassRoom';
import ConfirmationModal from '../ui/ConfirmationModal';

// --- Customized Icons for Premium Feel ---
const XIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
const HandIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const GridViewIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>;
const FullScreenIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>;
const DotsHorizontalIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" /></svg>;
const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const ReactionIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const ChevronLeftIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>;
const ChevronRightIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>;
const CalendarIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;

// parseClassName removed - imported from classUtils

interface ParticipantProps {
    name: string;
    isMuted: boolean;
    isCameraOff: boolean;
    isSpeaking?: boolean;
    isHandRaised?: boolean;
    avatarUrl?: string;
}

const AudioVisualizer: React.FC = () => (
    <div className="flex items-center space-x-1 h-4">
        <div className="w-1 bg-green-500 rounded-full animate-musical-bar-1 h-3"></div>
        <div className="w-1 bg-green-500 rounded-full animate-musical-bar-2 h-4"></div>
        <div className="w-1 bg-green-500 rounded-full animate-musical-bar-3 h-2"></div>
    </div>
);

const ParticipantTile: React.FC<ParticipantProps & { size: 'xs' | 'sm' | 'md' | 'lg' | 'featured' }> = ({ name, isMuted, isCameraOff, isSpeaking, isHandRaised, size, avatarUrl }) => {
    const sizeClasses = {
        xs: 'h-20 w-20 md:h-24 md:w-24 min-w-[5rem]',
        sm: 'h-28 w-36 md:h-32 md:w-44 min-w-[9rem]',
        md: 'h-40 md:h-48 lg:h-56',
        lg: 'h-56 md:h-64 lg:h-72',
        featured: 'h-full w-full absolute inset-0'
    };

    const avatarSizes = {
        xs: 'w-8 h-8 text-xs',
        sm: 'w-10 h-10 md:w-12 md:h-12 text-sm',
        md: 'w-14 h-14 md:w-16 md:h-16 text-xl',
        lg: 'w-20 h-20 md:w-24 md:h-24 text-2xl',
        featured: 'w-24 h-24 md:w-32 md:h-32 text-2xl md:text-4xl'
    };

    return (
        <div className={`relative group overflow-hidden rounded-xl md:rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 ${sizeClasses[size]} w-full bg-slate-100 border border-slate-200`}>
            {isSpeaking && <div className="absolute inset-0 border-2 border-green-400 rounded-xl md:rounded-2xl z-10 pointer-events-none animate-pulse"></div>}
            <div className={`absolute inset-0 flex items-center justify-center ${isCameraOff ? 'bg-gradient-to-br from-slate-100 to-slate-200' : 'bg-slate-900'}`}>
                {isCameraOff ? (
                    <div className={`rounded-full flex items-center justify-center font-bold text-white shadow-lg bg-gradient-to-br from-indigo-500 to-purple-600 ${avatarSizes[size]}`}>
                        {avatarUrl ? <img src={avatarUrl} alt={name} className="w-full h-full rounded-full object-cover border-2 border-white/20" /> : name.charAt(0)}
                    </div>
                ) : (
                    <div className="w-full h-full flex items-center justify-center relative">
                        <div className="w-full h-full bg-slate-800 opacity-40"></div>
                        <VideoIcon className={`text-slate-600 absolute opacity-20 ${size === 'xs' ? 'w-5 h-5' : 'w-10 h-10 md:w-12 md:h-12'}`} />
                    </div>
                )}
            </div>
            <div className="absolute top-2 right-2 flex space-x-1 z-20">
                {isHandRaised && (
                    <div className="bg-yellow-400 text-white p-1 rounded-full shadow-lg animate-bounce-subtle">
                        <HandIcon className="w-2.5 h-2.5 md:w-3 md:h-3" />
                    </div>
                )}
                {isMuted && (
                    <div className="bg-red-500/90 text-white p-1 rounded-full shadow-lg backdrop-blur-md">
                        <MicrophoneIcon className="w-2.5 h-2.5 md:w-3 md:h-3" />
                    </div>
                )}
            </div>
            <div className={`absolute bottom-2 left-2 z-20 max-w-[90%]`}>
                <div className={`flex items-center space-x-1.5 bg-white/90 backdrop-blur-md px-1.5 py-0.5 md:px-2 md:py-1 rounded-md md:rounded-lg shadow-sm border border-white/50 ${size === 'xs' ? 'scale-75 origin-bottom-left' : ''}`}>
                    {isSpeaking ? <AudioVisualizer /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>}
                    <span className="text-xs md:text-xs font-semibold text-slate-800 truncate select-none">{name}</span>
                </div>
            </div>
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 pointer-events-none" />
        </div>
    );
};

const ChatBubble: React.FC<{ name: string, message: string, time: string, isYou?: boolean }> = ({ name, message, time, isYou }) => (
    <div className={`flex flex-col ${isYou ? 'items-end' : 'items-start'} mb-4 animate-slide-in-up`}>
        <div className="flex items-baseline space-x-2 mb-1 px-1">
            <span className={`text-xs font-bold ${isYou ? 'text-indigo-600' : 'text-slate-600'}`}>{name}</span>
            <span className="text-xs text-slate-400">{time}</span>
        </div>
        <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] text-sm shadow-sm leading-relaxed ${isYou ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'}`}>
            {message}
        </div>
    </div>
);

interface ClassSession {
    id: string;
    grade: string;
    rawGrade: number;
    rawSection: string;
    subject: string;
    description: string;
    time: string;
    studentsCount: number;
}

const ClassSelectionScreen: React.FC<{
    onStartClass: (session: ClassSession, subject: string, topic: string, duration: string, initialMuted: boolean, initialCameraOff: boolean) => void;
    userId?: string;
    schoolId?: string;
    displayName?: string;
}> = ({ onStartClass, userId, schoolId, displayName }) => {
    const [selectedClass, setSelectedClass] = useState<ClassSession | null>(null);
    const [subject, setSubject] = useState('');
    const [topic, setTopic] = useState('');
    const [duration, setDuration] = useState('60');
    const [classes, setClasses] = useState<ClassSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [lobbyMuted, setLobbyMuted] = useState(false);
    const [lobbyCameraOff, setLobbyCameraOff] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [pastSessions, setPastSessions] = useState<any[]>([]);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [sessionToDelete, setSessionToDelete] = useState<{ id: string; isLive: boolean } | null>(null);
    const videoPreviewRef = useRef<HTMLVideoElement>(null);

    const { classes: rawClasses, loading: classesLoading } = useTeacherClasses();

    useEffect(() => {
        if (!rawClasses || rawClasses.length === 0) {
            setClasses([]);
            setLoading(false);
            return;
        }

        const formattedClasses: ClassSession[] = rawClasses.map(c => ({
            id: c.id,
            grade: `${getFormattedClassName(c.grade, c.section)}`,
            rawGrade: c.grade,
            rawSection: c.section,
            subject: c.subject || 'General',
            description: `Class Session for ${getFormattedClassName(c.grade, c.section)}`,
            time: 'Now',
            studentsCount: c.studentCount || 0
        }));

        setClasses(formattedClasses);
        setLoading(classesLoading);
    }, [rawClasses, classesLoading]);

    useEffect(() => {
        if (selectedClass) setSubject(selectedClass.subject);
    }, [selectedClass]);

    useEffect(() => {
        // Show ALL sessions so the teacher can delete any of them,
        // including live ones they accidentally left running.
        api.getMyVirtualClassSessions().then(sessions => {
            setPastSessions(sessions);
        }).catch(() => {});
    }, [refreshTrigger]);

    const handleDeleteSession = async (id: string) => {
        setDeletingId(id);
        try {
            await api.deleteVirtualClassSession(id);
            setPastSessions(prev => prev.filter(s => s.id !== id));
            toast.success('Session deleted');
        } catch (e: any) {
            toast.error('Could not delete session');
        } finally {
            setDeletingId(null);
        }
    };

    useEffect(() => {
        let stream: MediaStream | null = null;
        if (!lobbyCameraOff) {
            navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                .then(s => {
                    stream = s;
                    if (videoPreviewRef.current) videoPreviewRef.current.srcObject = s;
                })
                .catch(err => {
                    console.error("Lobby Camera Error:", err);
                    setLobbyCameraOff(true);
                });
        }
        return () => { stream?.getTracks().forEach(t => t.stop()); };
    }, [lobbyCameraOff]);

    return (
        <>
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] bg-slate-50 p-4 md:p-8">
            <div className="w-full max-w-6xl space-y-6 md:space-y-8 animate-fade-in-up">
                <div className="text-center space-y-2">
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Classroom Lobby</h1>
                    <p className="text-slate-500 text-sm md:text-base">Configure your session details and check your equipment.</p>
                </div>
                <div className="grid lg:grid-cols-12 gap-6 md:gap-8">
                    <div className="lg:col-span-4 space-y-4 order-2 lg:order-1">
                        <div className="flex items-center space-x-2 text-slate-700 font-semibold mb-2">
                            <CalendarIcon className="w-5 h-5 text-indigo-500" />
                            <h2>Classes</h2>
                        </div>
                        <div className="space-y-3 h-[240px] overflow-y-auto custom-scrollbar lg:pr-2">
                            {loading && <p className="text-center text-slate-400 py-4">Loading classes...</p>}
                            {!loading && classes.length === 0 && <p className="text-center text-slate-400 py-4">No classes found.</p>}
                            {classes.map((cls) => (
                                <div key={cls.id}
                                    onClick={() => setSelectedClass(cls)}
                                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md relative group ${selectedClass?.id === cls.id ? 'border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500/20' : 'border-slate-200 bg-white hover:border-indigo-200'}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="pr-2">
                                            <h3 className={`font-bold text-sm md:text-base ${selectedClass?.id === cls.id ? 'text-indigo-900' : 'text-slate-800'}`}>{cls.grade}</h3>
                                            <p className={`text-xs md:text-sm font-medium ${selectedClass?.id === cls.id ? 'text-indigo-700' : 'text-slate-600'}`}>{cls.subject}</p>
                                            <p className="text-xs text-slate-400 mt-1 line-clamp-1">{cls.description}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <span className="block text-xs md:text-xs font-semibold text-indigo-600 bg-indigo-100 px-2 py-1 rounded-full">{cls.time}</span>
                                            <span className="block text-xs text-slate-400 mt-1">{cls.studentsCount} Students</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Past Sessions */}
                        {pastSessions.length > 0 && (
                            <div className="pt-4 border-t border-slate-200">
                                <div className="flex items-center space-x-2 text-slate-600 font-semibold mb-2">
                                    <TrashIcon className="w-4 h-4 text-slate-400" />
                                    <h3 className="text-sm">Past Sessions</h3>
                                </div>
                                <div className="space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar lg:pr-2">
                                    {pastSessions.map(s => {
                                        const now = new Date();
                                        const isLive = s.status === 'active' && (!s.end_time || new Date(s.end_time) > now);
                                        const isExpired = s.status === 'active' && s.end_time && new Date(s.end_time) < now;
                                        const statusLabel = isLive ? 'Still Live' : isExpired ? 'Expired' : 'Ended';
                                        return (
                                            <div key={s.id} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-semibold text-slate-700 truncate">{s.subject || s.title}</p>
                                                    <p className="text-xs text-slate-400">{new Date(s.start_time).toLocaleDateString()} · <span className={isLive ? 'text-red-500 font-semibold' : ''}>{statusLabel}</span></p>
                                                </div>
                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                    {isLive && (
                                                        <button
                                                            onClick={() => window.open(
                                                                buildJitsiUrl(s.id, displayName || 'Teacher'),
                                                                `jitsi_${s.id.replace(/-/g, '')}`
                                                            )}
                                                            className="px-2 py-1 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all active:scale-95 whitespace-nowrap"
                                                        >
                                                            Rejoin
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => setSessionToDelete({ id: s.id, isLive })}
                                                        disabled={deletingId === s.id}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-50"
                                                        title="Delete session"
                                                        aria-label="Delete session"
                                                    >
                                                        {deletingId === s.id
                                                            ? <div className="w-3.5 h-3.5 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" />
                                                            : <TrashIcon className="w-3.5 h-3.5" />
                                                        }
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="lg:col-span-8 bg-white p-4 md:p-6 rounded-2xl shadow-lg border border-slate-200 flex flex-col md:flex-row gap-6 order-1 lg:order-2">
                        <div className="flex-1 space-y-5">
                            <h3 className="font-bold text-slate-800 text-lg border-b border-slate-100 pb-2">Session Details</h3>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Class Subject</label>
                                <input type="text" className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm bg-slate-50 font-semibold text-slate-800" placeholder="e.g. Mathematics" value={subject} onChange={(e) => setSubject(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Duration</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {['30', '45', '60', '90'].map((m) => (
                                        <button key={m} onClick={() => setDuration(m)} className={`py-2 px-1 rounded-lg text-sm font-medium border transition-all ${duration === m ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>{m}m</button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Agenda / Topic</label>
                                <textarea className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none h-24 text-sm bg-slate-50" placeholder="Enter today's lesson topic..." value={topic} onChange={(e) => setTopic(e.target.value)} />
                            </div>
                        </div>
                        <div className="flex-1 flex flex-col space-y-6">
                            <h3 className="font-bold text-slate-800 text-lg border-b border-slate-100 pb-2 hidden md:block">Preview</h3>
                            <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden shadow-inner flex items-center justify-center group ring-1 ring-black/5">
                                <video ref={videoPreviewRef} autoPlay muted playsInline className={`w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-300 ${lobbyCameraOff ? 'opacity-0' : 'opacity-100'}`} />
                                {lobbyCameraOff && (
                                    <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                                        <div className="text-center">
                                            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-2"><VideoIcon className="w-8 h-8 opacity-50" /></div>
                                            <span className="text-sm font-medium">Camera is off</span>
                                        </div>
                                    </div>
                                )}
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center space-x-4 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-lg">
                                    <button onClick={() => setLobbyMuted(!lobbyMuted)} className={`p-2.5 rounded-full transition-all ${lobbyMuted ? 'bg-red-500 text-white' : 'bg-white/20 text-white'}`}><MicrophoneIcon className="w-5 h-5" /></button>
                                    <button onClick={() => setLobbyCameraOff(!lobbyCameraOff)} className={`p-2.5 rounded-full transition-all ${lobbyCameraOff ? 'bg-red-500 text-white' : 'bg-white/20 text-white'}`}><VideoIcon className="w-5 h-5" /></button>
                                </div>
                            </div>
                            <div className="mt-auto pt-4">
                                <button disabled={!selectedClass} onClick={() => selectedClass && onStartClass(selectedClass, subject, topic, duration, lobbyMuted, lobbyCameraOff)} className={`w-full py-4 rounded-xl font-bold shadow-lg transition-all transform active:scale-[0.98] flex items-center justify-center space-x-2 text-sm md:text-base ${!selectedClass ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200 hover:shadow-indigo-300'}`}>
                                    <VideoIcon className="w-5 h-5" />
                                    <span>{selectedClass ? 'Start Class Session' : 'Select a Class First'}</span>
                                </button>
                                <p className="text-xs text-center text-slate-400 mt-3 flex items-center justify-center"><ShareIcon className="w-3 h-3 mr-1" />Students will be notified automatically</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <ConfirmationModal
            isOpen={!!sessionToDelete}
            onClose={() => setSessionToDelete(null)}
            onConfirm={() => { if (sessionToDelete) handleDeleteSession(sessionToDelete.id); }}
            title={sessionToDelete?.isLive ? 'Delete Live Session' : 'Delete Session'}
            message={sessionToDelete?.isLive
                ? 'This class is still live. Deleting it now will remove it for all students immediately. Continue?'
                : 'Delete this session? Students will no longer see it.'}
            confirmText="Delete"
            isDanger
        />
        </>
    );
}

const VirtualClassScreen: React.FC = () => {
    const { user, currentSchool } = useAuth();
    const [activeSession, setActiveSession] = useState<{ classDetails: ClassSession, subject: string, topic: string, duration: string } | null>(null);
    // Backend session id for the live class — needed to mark it ended on the server
    // so students' "Join Live Class" button disappears when the teacher ends it.
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [showEndClassConfirm, setShowEndClassConfirm] = useState(false);
    const [participants, setParticipants] = useState<any[]>([]);
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [isHandRaised, setIsHandRaised] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [activeSidebarTab, setActiveSidebarTab] = useState<'participants' | 'chat'>('chat');
    const [viewMode, setViewMode] = useState<'grid' | 'speaker'>('speaker');
    const [currentTime, setCurrentTime] = useState(new Date());
    const [showReactions, setShowReactions] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [elapsedTime, setElapsedTime] = useState(0);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        if (activeSession) {
            const loadStudents = async () => {
                try {
                    const students = await api.getStudentsByClass(activeSession.classDetails.rawGrade, activeSession.classDetails.rawSection);
                    setParticipants(students.map((s, i) => ({
                        name: s.full_name || s.name,
                        avatarUrl: s.avatar_url || s.avatarUrl,
                        isMuted: true,
                        isCameraOff: true,
                        isSpeaking: false,
                        isHandRaised: false,
                        id: s.id
                    })));
                } catch (e) { console.error(e); }
            };
            loadStudents();
        }
    }, [activeSession]);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (activeSession) {
            timer = setInterval(() => { setElapsedTime(prev => prev + 1); }, 1000);
        } else { setElapsedTime(0); }
        return () => clearInterval(timer);
    }, [activeSession]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Camera/microphone are now handled inside the shared live room (Jitsi), so we
    // no longer grab a separate local stream here — doing so would lock the camera
    // and stop the real room from using it.

    const handleStartClass = async (cls: ClassSession, subject: string, topic: string, duration: string, initialMuted: boolean, initialCameraOff: boolean) => {
        if (!user) return;
        setIsMuted(initialMuted);
        setIsCameraOff(initialCameraOff);

        // Pre-open a blank window synchronously inside the click-handler so the
        // browser's popup blocker allows it. We set the real URL after the API call.
        const jitsiWin = window.open('about:blank', 'jitsi_teacher_class');

        try {
            const session = await api.createVirtualClassSession({
                teacher_id: user.id,
                class_id: cls.id,
                title: `Live Session: ${subject} for ${cls.grade}`,
                subject: subject,
                topic: topic,
                status: 'active',
                start_time: new Date().toISOString(),
                meeting_url: 'internal_jitsi',
                duration_minutes: parseInt(duration),
            });

            // Now we have the session id — set the real Jitsi URL in the pre-opened window.
            if (jitsiWin) {
                jitsiWin.location.href = buildJitsiUrl(
                    session.id,
                    user?.full_name || user?.name || 'Teacher'
                );
            }

            // Set the room id FIRST, then open the room, so the teacher and the
            // students all share the exact same live room (keyed by session id).
            setActiveSessionId(session?.id || null);
            setActiveSession({ classDetails: cls, subject, topic, duration });

            api.createNotification({
                title: `🎬 Live Class: ${subject}`,
                message: `Your ${subject} class is starting now. Click to join!`,
                category: 'System',
                audience: [`Grade ${cls.rawGrade}`],
                related_id: session.id,
                is_read: false
            }).catch(() => { /* notification is best-effort */ });
            toast.success('Class session started live!');
        } catch (e: any) {
            jitsiWin?.close();
            toast.error('Failed to start session: ' + e.message);
        }
    };

    const handleEndClass = async () => {
        if (activeSessionId) {
            try { await api.endVirtualClassSession(activeSessionId); } catch (e) { console.error('Failed to end session', e); }
        }
        setActiveSession(null);
        setActiveSessionId(null);
    };

    // Until the session is created we don't have the room id, so keep showing the
    // class picker. Once it's live, drop the teacher into the shared room.
    if (!activeSession || !activeSessionId) {
        return <ClassSelectionScreen onStartClass={handleStartClass} schoolId={currentSchool?.id} displayName={user?.full_name || user?.name || 'Teacher'} />;
    }

    return (
        <>
            <LiveClassRoom
                sessionId={activeSessionId}
                displayName={user?.full_name || user?.name || 'Teacher'}
                subject={activeSession.subject}
                topic={activeSession.topic}
                actionLabel="End Class"
                onExit={() => setShowEndClassConfirm(true)}
            />
            <ConfirmationModal
                isOpen={showEndClassConfirm}
                onClose={() => setShowEndClassConfirm(false)}
                onConfirm={handleEndClass}
                title="End Class"
                message="End class for everyone? All students will be disconnected."
                confirmText="End Class"
                isDanger
            />
        </>
    );
};

export default VirtualClassScreen;
