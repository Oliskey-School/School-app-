import React, { useState, useEffect } from 'react';
import { VirtualClass } from '../../types-additional';
import { toast } from 'react-hot-toast';
import { VideoCameraIcon, CalendarIcon, ClockIcon } from '../../constants';
import api from '../../lib/api';
import LiveClassRoom from './LiveClassRoom';

interface VirtualClassroomProps {
    userRole: 'teacher' | 'student';
    userId: string;
    displayName?: string;
}

const VirtualClassroom: React.FC<VirtualClassroomProps> = ({ userRole, userId, displayName }) => {
    const [classes, setClasses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showJitsi, setShowJitsi] = useState(false);
    const [selectedClass, setSelectedClass] = useState<any | null>(null);

    useEffect(() => {
        fetchClasses();
    }, []);

    const fetchClasses = async () => {
        try {
            setLoading(true);
            const data = await api.getVirtualClasses(userId, userRole);
            setClasses(data || []);
        } catch (error) {
            console.error('Error fetching classes:', error);
        } finally {
            setLoading(false);
        }
    };

    const joinClass = (session: any) => {
        setSelectedClass(session);
        setShowJitsi(true);

        // Record attendance if student
        if (userRole === 'student') {
            api.recordVirtualAttendance(session.id, userId)
                .then(() => console.log('Attendance recorded'))
                .catch(err => console.error('Failed to record attendance', err));
        }
    };

    if (showJitsi && selectedClass) {
        // Same shared room as the teacher (keyed by session id), so the student
        // actually sees/hears the teacher and classmates.
        return (
            <LiveClassRoom
                sessionId={selectedClass.id}
                displayName={displayName || 'Student'}
                subject={selectedClass.subject}
                topic={selectedClass.topic || 'Class Session'}
                actionLabel="Leave Class"
                onExit={() => {
                    setShowJitsi(false);
                    setSelectedClass(null);
                }}
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

            {/* Classes List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {classes.map((session) => (
                    <div key={session.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 md:p-6 hover:shadow-md transition-all group">
                        <div className="flex items-start justify-between mb-4">
                            <div className="space-y-1">
                                <h3 className="font-bold text-slate-800 text-lg group-hover:text-indigo-600 transition-colors">{session.subject}</h3>
                                <p className="text-sm text-slate-500 font-medium">{session.topic || 'General Class Session'}</p>
                            </div>
                            <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${session.status === 'active' ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-500'}`}>
                                {session.status === 'active' ? 'LIVE' : 'ENDED'}
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
                                // Backend returns full_name; fall back defensively.
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
                            onClick={() => joinClass(session)}
                            disabled={session.status !== 'active'}
                            className={`w-full py-3 rounded-xl font-bold flex items-center justify-center space-x-2 transition-all active:scale-[0.98] ${
                                session.status === 'active' 
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200' 
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                        >
                            <VideoCameraIcon className="h-5 w-5" />
                            <span>{session.status === 'active' ? 'Join Now' : 'Class Ended'}</span>
                        </button>
                    </div>
                ))}

                {!loading && classes.length === 0 && (
                    <div className="col-span-full bg-white rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <VideoCameraIcon className="h-10 w-10 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">No sessions found</h3>
                        <p className="text-slate-500 mt-1">When your teachers start a class, it will appear here.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VirtualClassroom;
