import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { VirtualClass } from '../../types-additional';
import { toast } from 'react-hot-toast';
import { VideoCameraIcon, CalendarIcon, ClockIcon } from '../../constants';

interface VirtualClassroomProps {
    userRole: 'teacher' | 'student';
    userId: string;
}

const VirtualClassroom: React.FC<VirtualClassroomProps> = ({ userRole, userId }) => {
    const [classes, setClasses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showJitsi, setShowJitsi] = useState(false);
    const [selectedClass, setSelectedClass] = useState<any | null>(null);

    useEffect(() => {
        fetchClasses();

        // REAL-TIME LISTENER for the classroom list
        const channel = supabase.channel('virtual-classroom-list')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'virtual_class_sessions' }, () => {
                fetchClasses();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const fetchClasses = async () => {
        try {
            let query = supabase
                .from('virtual_class_sessions')
                .select('*, teacher:teachers(name)')
                .order('start_time', { ascending: false });

            if (userRole === 'teacher') {
                query = query.eq('teacher_id', userId);
            }

            const { data, error } = await query;
            if (error) throw error;

            setClasses(data || []);
        } catch (error) {
            console.error('Error fetching classes:', error);
            // toast.error('Failed to load classes');
        } finally {
            setLoading(false);
        }
    };

    const joinClass = (session: any) => {
        setSelectedClass(session);
        setShowJitsi(true);

        // Record attendance if student
        if (userRole === 'student') {
            supabase
                .from('class_attendance_virtual')
                .upsert({
                    session_id: session.id,
                    student_id: userId,
                    joined_at: new Date().toISOString()
                })
                .then(() => console.log('Attendance recorded'));
        }
    };

    if (showJitsi && selectedClass) {
        // Internal Jitsi Meet integration
        const domain = "meet.jit.si";
        const roomName = `OliskeyClass_${selectedClass.id}`;
        const jitsiUrl = `https://${domain}/${roomName}`;

        return (
            <div className="fixed inset-0 bg-black z-[100] flex flex-col">
                <div className="flex items-center justify-between bg-slate-900 text-white p-4 border-b border-slate-800">
                    <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                        <h2 className="font-bold text-lg">{selectedClass.subject}</h2>
                        <span className="text-slate-400 text-sm hidden md:inline">| {selectedClass.topic || 'Class Session'}</span>
                    </div>
                    <button
                        onClick={() => {
                            setShowJitsi(false);
                            setSelectedClass(null);
                        }}
                        className="px-6 py-2 bg-red-600 rounded-xl hover:bg-red-700 font-bold transition-all active:scale-95 shadow-lg shadow-red-900/20"
                    >
                        Leave Class
                    </button>
                </div>
                <iframe
                    src={jitsiUrl}
                    allow="camera; microphone; fullscreen; display-capture"
                    className="w-full flex-1"
                    title="Virtual Classroom"
                />
            </div>
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
                            {session.teacher && (
                                <div className="flex items-center space-x-2 pt-1 border-t border-slate-200">
                                    <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                                        {session.teacher.name.charAt(0)}
                                    </div>
                                    <p className="text-xs font-semibold">Teacher: {session.teacher.name}</p>
                                </div>
                            )}
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
