import React, { useState, useEffect } from 'react';
import {
    submitTeacherAttendance,
    getTeacherAttendanceHistory,
    getTodayAttendanceStatus,
    TeacherAttendance,
} from '../../lib/teacherAttendanceService';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { CheckCircleIcon, CalendarIcon } from '../../constants';
import { useProfile } from '../../context/ProfileContext';
import { useAuth } from '../../context/AuthContext';

interface TeacherSelfAttendanceProps {
    navigateTo: (view: string, title: string, props?: any) => void;
    teacherId?: string | null;
}

const TeacherSelfAttendance: React.FC<TeacherSelfAttendanceProps> = ({ navigateTo, teacherId: propTeacherId }) => {
    const { profile } = useProfile();
    const { user } = useAuth();
    const [teacherId, setTeacherId] = useState<string | null>(propTeacherId || null);
    const [todayStatus, setTodayStatus] = useState<TeacherAttendance | null>(null);
    const [attendanceHistory, setAttendanceHistory] = useState<TeacherAttendance[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Resolve teacher ID if not provided
    useEffect(() => {
        const resolveTeacherId = async () => {
            if (propTeacherId) {
                setTeacherId(propTeacherId);
                return;
            }

            // Try using profile ID directly
            if (profile?.id) {
                const resolvedId = String(profile.id); // Ensure it's a string
                console.log('✅ Using profile.id as teacherId:', resolvedId);
                setTeacherId(resolvedId);
                return;
            }

            // Fallback: fetch teacher by email
            const emailToQuery = profile?.email || user?.email;

            if (!emailToQuery) {
                console.warn('⚠️ No email available to query teacher profile');
                setLoading(false);
                return;
            }

            console.log('🔍 Fetching teacher by email:', emailToQuery);

            try {
                const { data: teacherData, error: teacherError } = await supabase
                    .from('teachers')
                    .select('id, name, email')
                    .eq('email', emailToQuery)
                    .maybeSingle();

                if (teacherError) {
                    console.error('❌ Error fetching teacher profile by email:', teacherError);
                    setLoading(false);
                    return;
                }

                if (teacherData) {
                    const resolvedId = String(teacherData.id); // Ensure it's a string
                    console.log('✅ Found teacher by email:', { id: resolvedId, name: teacherData.name });
                    setTeacherId(resolvedId);
                } else {
                    console.warn('⚠️ No teacher profile found for email:', emailToQuery);
                    setLoading(false);
                }
            } catch (err) {
                console.error('❌ Error in teacher lookup:', err);
                setLoading(false);
            }
        };

        resolveTeacherId();
    }, [propTeacherId, profile?.id, profile?.email, user?.email]);

    const loadAttendanceData = async () => {

        if (!teacherId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            // Get today's status
            const statusRes = await getTodayAttendanceStatus(teacherId);
            if (statusRes.success) {
                setTodayStatus(statusRes.data);
            }

            // Get attendance history
            const historyRes = await getTeacherAttendanceHistory(teacherId, 30);
            if (historyRes.success) {
                setAttendanceHistory(historyRes.data || []);
            }
        } catch (error) {
            console.error('Error loading attendance data:', error);
            toast.error("Failed to load attendance records");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (teacherId) {
            loadAttendanceData();

            // Subscribe to real-time updates for THIS teacher
            const channel = supabase.channel(`teacher_attendance_${teacherId}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'teacher_attendance',
                        filter: `teacher_id=eq.${teacherId}`,
                    },
                    () => {
                        loadAttendanceData();
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        } else {
            setLoading(false);
        }
    }, [teacherId]);

    const handleCheckIn = async () => {
        if (!teacherId) {
            toast.error("Teacher profile not found. Please contact admin.");
            return;
        }

        setSubmitting(true);
        try {
            const res = await submitTeacherAttendance(teacherId);
            if (res.success) {
                toast.success("Attendance marked successfully!");
                loadAttendanceData(); // Refresh
            } else {
                toast.error(res.error || "Failed to mark attendance");
            }
        } catch (error) {
            console.error('Check-in error:', error);
            toast.error("An unexpected error occurred");
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusColor = (status: string) => {
        const lowerStatus = status.toLowerCase();
        switch (lowerStatus) {
            case 'approved': return 'bg-green-100 text-green-700';
            case 'pending': return 'bg-amber-100 text-amber-700';
            case 'rejected': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-10">
                <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-500 font-medium">Loading attendance records...</p>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-6">
            {/* Header / Intro */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Today's Attendance</h2>
                        <p className="text-sm text-gray-500 font-medium">
                            {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
                        <CalendarIcon className="h-6 w-6 text-purple-600" />
                    </div>
                </div>

                {todayStatus ? (
                    <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <CheckCircleIcon className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Check-in Time</p>
                                <p className="text-lg font-bold text-gray-800">{todayStatus.check_in}</p>
                            </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(todayStatus.approval_status)}`}>
                            {todayStatus.approval_status.charAt(0).toUpperCase() + todayStatus.approval_status.slice(1)}
                        </span>
                    </div>
                ) : (
                    <button
                        onClick={handleCheckIn}
                        disabled={submitting}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-purple-100 transition-all active:scale-95 disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2"
                    >
                        {submitting ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <CheckCircleIcon className="h-5 w-5" />
                        )}
                        {submitting ? 'Processing...' : 'Mark Attendance (Check In)'}
                    </button>
                )}
            </div>

            {/* Attendance History */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-800 px-1">Attendance History</h3>

                <div className="space-y-3">
                    {attendanceHistory.length === 0 ? (
                        <div className="text-center py-10">
                            <p className="text-gray-500">No attendance records yet.</p>
                        </div>
                    ) : (
                        attendanceHistory.map((record) => (
                            <div key={record.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="text-center bg-gray-50 rounded-lg p-2 min-w-[50px]">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">
                                            {new Date(record.date).toLocaleDateString('en-US', { month: 'short' })}
                                        </p>
                                        <p className="text-lg font-bold text-gray-700">
                                            {new Date(record.date).getDate()}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-800">Check-in: {record.check_in}</p>
                                        <p className="text-xs text-gray-500">{record.status || 'Present'}</p>
                                    </div>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${getStatusColor(record.approval_status)}`}>
                                    {record.approval_status.charAt(0).toUpperCase() + record.approval_status.slice(1)}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default TeacherSelfAttendance;
