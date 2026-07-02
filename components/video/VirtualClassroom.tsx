import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { VideoCameraIcon, CalendarIcon, ClockIcon } from '../../constants';
import api from '../../lib/api';
import LiveClassRoom, { buildJitsiUrl } from './LiveClassRoom';
import { useAuth } from '../../context/AuthContext';

interface VirtualClassroomProps {
    userRole: 'teacher' | 'student';
    userId: string;
    displayName?: string;
}

const VirtualClassroom: React.FC<VirtualClassroomProps> = ({ userRole, userId, displayName }) => {
    const { currentBranchId } = useAuth();
    const [classes, setClasses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showJitsi, setShowJitsi] = useState(false);
    const [selectedClass, setSelectedClass] = useState<any | null>(null);
    const [classEnded, setClassEnded] = useState(false);

    // Ref so the socket handler always sees the current selectedClass without
    // causing the effect to re-subscribe on every join/leave.
    const selectedClassRef = useRef<any>(null);
    useEffect(() => { selectedClassRef.current = selectedClass; }, [selectedClass]);

    const fetchClasses = useCallback(async () => {
        try {
            const data = await api.getActiveVirtualClasses(currentBranchId || undefined);
            setClasses(data || []);
        } catch (error) {
            console.error('[VirtualClassroom] Error fetching classes:', error);
        } finally {
            setLoading(false);
        }
    }, [currentBranchId]);

    useEffect(() => {
        setLoading(true);
        fetchClasses();

        // Polling as fallback when socket delivery is unreliable
        const interval = setInterval(fetchClasses, 30_000);

        // Real-time: teacher started a class → refresh list immediately
        const onStarted = () => fetchClasses();

        // Real-time: teacher ended a class → refresh list + notify student if in-session
        const onEnded = (e: Event) => {
            const sessionId = (e as CustomEvent).detail?.sessionId;
            fetchClasses();
            if (sessionId && selectedClassRef.current?.id === sessionId) {
                setClassEnded(true);
            }
        };

        // Real-time: teacher deleted a session → remove it from the list immediately
        const onDeleted = (e: Event) => {
            const sessionId = (e as CustomEvent).detail?.sessionId;
            if (sessionId) {
                setClasses(prev => prev.filter(c => c.id !== sessionId));
                if (selectedClassRef.current?.id === sessionId) {
                    setClassEnded(true);
                }
            }
        };

        window.addEventListener('virtual-class:started', onStarted);
        window.addEventListener('virtual-class:ended', onEnded);
        window.addEventListener('virtual-class:deleted', onDeleted);

        return () => {
            clearInterval(interval);
            window.removeEventListener('virtual-class:started', onStarted);
            window.removeEventListener('virtual-class:ended', onEnded);
            window.removeEventListener('virtual-class:deleted', onDeleted);
        };
    }, [fetchClasses]);

    const joinClass = (session: any) => {
        // Open Jitsi in a new tab before any async work — browser allows window.open
        // only in direct response to a user gesture. Named window reuses the tab on re-join.
        window.open(
            buildJitsiUrl(session.id, displayName || 'Student'),
            `jitsi_${session.id.replace(/-/g, '')}`
        );

        setSelectedClass(session);
        setClassEnded(false);
        setShowJitsi(true);

        if (userRole === 'student') {
            api.recordVirtualAttendance(session.id, userId)
                .catch(err => console.error('[VirtualClassroom] Failed to record attendance', err));
        }
    };

    const leaveClass = () => {
        setShowJitsi(false);
        setSelectedClass(null);
        setClassEnded(false);
    };

    // "Class has ended" — shown via portal so it covers the full viewport even
    // when rendered inside the dashboard's stacking context.
    if (showJitsi && selectedClass && classEnded) {
        return createPortal(
            <div className="fixed inset-0 bg-slate-900 z-[9999] flex flex-col items-center justify-center text-white">
                <div className="text-6xl mb-4">📹</div>
                <h2 className="text-2xl font-bold mb-2">Class has ended</h2>
                <p className="text-slate-400 mb-8">Your teacher has ended this session.</p>
                <button
                    onClick={leaveClass}
                    className="px-8 py-3 bg-indigo-600 rounded-xl font-bold hover:bg-indigo-700 transition-all active:scale-95"
                >
                    Back to Virtual Classroom
                </button>
            </div>,
            document.body
        );
    }

    if (showJitsi && selectedClass) {
        return (
            <LiveClassRoom
                sessionId={selectedClass.id}
                displayName={displayName || 'Student'}
                subject={selectedClass.subject}
                topic={selectedClass.topic || 'Class Session'}
                actionLabel="Leave Class"
                onExit={leaveClass}
            />
        );
    }

    return (
        <div className="p-4 md:p-6 space-y-6 bg-slate-50 min-h-full">
            {/* Header */}
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-slate-800">Virtual Classroom</h2>
                    <p className="text-sm text-slate-500">Join your live sessions here</p>
                </div>
                <div className="p-2 bg-indigo-50 rounded-xl">
                    <VideoCameraIcon className="h-6 w-6 text-indigo-600" />
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                </div>
            )}

            {/* Session cards */}
            {!loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {classes.map((session) => {
                        const isExpired = session.end_time && new Date(session.end_time) < new Date();
                        const isJoinable = session.status === 'active' && !isExpired;
                        return (
                        <div key={session.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 md:p-6 hover:shadow-md transition-all group">
                            <div className="flex items-start justify-between mb-4">
                                <div className="space-y-1">
                                    <h3 className="font-bold text-slate-800 text-lg group-hover:text-indigo-600 transition-colors">{session.subject}</h3>
                                    <p className="text-sm text-slate-500 font-medium">{session.topic || 'General Class Session'}</p>
                                </div>
                                <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${
                                    isExpired ? 'bg-orange-100 text-orange-600' :
                                    session.status === 'active' ? 'bg-red-100 text-red-600 animate-pulse' :
                                    'bg-slate-100 text-slate-500'
                                }`}>
                                    {isExpired ? 'EXPIRED' : session.status === 'active' ? 'LIVE' : 'ENDED'}
                                </span>
                            </div>

                            <div className="space-y-3 text-sm text-slate-600 mb-6 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <div className="flex items-center space-x-2">
                                    <CalendarIcon className="h-4 w-4 text-slate-400" />
                                    <span className="font-medium">{new Date(session.start_time).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <ClockIcon className="h-4 w-4 text-slate-400" />
                                    <span className="font-medium">{new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                {session.teacher && (() => {
                                    const teacherName = session.teacher.full_name || session.teacher.name || 'Teacher';
                                    return (
                                        <div className="flex items-center space-x-2 pt-1 border-t border-slate-200">
                                            <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                                                {teacherName.charAt(0)}
                                            </div>
                                            <p className="text-xs font-semibold">Teacher: {teacherName}</p>
                                        </div>
                                    );
                                })()}
                            </div>

                            <button
                                onClick={() => isJoinable && joinClass(session)}
                                disabled={!isJoinable}
                                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center space-x-2 transition-all active:scale-[0.98] ${
                                    isJoinable
                                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200'
                                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                }`}
                            >
                                <VideoCameraIcon className="h-5 w-5" />
                                <span>{isJoinable ? 'Join Now' : isExpired ? 'Session Expired' : 'Class Ended'}</span>
                            </button>
                        </div>
                        );
                    })}

                    {classes.length === 0 && (
                        <div className="col-span-full bg-white rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <VideoCameraIcon className="h-10 w-10 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800">No sessions found</h3>
                            <p className="text-slate-500 mt-1">When your teachers start a class, it will appear here.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default VirtualClassroom;
