import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { CheckCircleIcon, CalendarIcon } from '../../constants';
import { useProfile } from '../../context/ProfileContext';
import { useAuth } from '../../context/AuthContext';

interface TeacherAttendance {
    id: string;
    teacher_id: string;
    date: string;
    status: string;
    approval_status: string;
    check_in: string;
}

interface TeacherSelfAttendanceProps {
    navigateTo: (view: string, title: string, props?: any) => void;
    teacherId?: string | null;
}

const TeacherSelfAttendance: React.FC<TeacherSelfAttendanceProps> = ({ navigateTo, teacherId: propTeacherId }) => {
    const { profile } = useProfile();
    const { user } = useAuth();
    const [todayStatus, setTodayStatus] = useState<TeacherAttendance | null>(null);
    const [attendanceHistory, setAttendanceHistory] = useState<TeacherAttendance[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const loadAttendanceData = async () => {
        setLoading(true);
        try {
            // Get attendance history (which includes today)
            // Use current school/branch context for accurate history
            const history = await api.getTeacherAttendanceHistory(30);
            setAttendanceHistory(history || []);

            // Find today's entry
            const todayStr = new Date().toISOString().split('T')[0];
            const today = history.find(h => h.date === todayStr);
            setTodayStatus(today || null);
            
            console.log(`✅ [SelfAttendance] Loaded ${history.length} records. Today status:`, today?.approval_status || 'none');
        } catch (error) {
            console.error('Error loading attendance data:', error);
            // toast.error("Failed to load attendance records");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAttendanceData();
    }, [user?.id]);

    useEffect(() => {
        const handleRealtimeUpdate = (event: any) => {
            const { table } = event.detail;
            if (table === 'teacher_attendance') {
                console.log('🔄 [SelfAttendance] Realtime update detected, refreshing...');
                loadAttendanceData();
            }
        };

        window.addEventListener('realtime-update', handleRealtimeUpdate);
        return () => window.removeEventListener('realtime-update', handleRealtimeUpdate);
    }, [user?.id]);

    const handleCheckIn = async () => {
        setSubmitting(true);
        try {
            const result = await api.submitTeacherAttendance();
            console.log('✅ [SelfAttendance] Check-in result:', result);
            toast.success("Attendance marked successfully!");
            
            // Critical: Manually trigger a slight delay before refresh to allow DB consistency
            // or just refresh immediately if the result contains the data
            await loadAttendanceData(); 
            
            // Dispatch global event for other components (like history screen)
            window.dispatchEvent(new CustomEvent('realtime-update', { detail: { table: 'teacher_attendance' } }));
        } catch (error: any) {
            console.error('Check-in error:', error);
            toast.error(error.message || "Failed to mark attendance");
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusColor = (status?: string) => {
        if (!status) return 'bg-gray-100 text-gray-700';
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
                    <button
                        onClick={() => navigateTo('attendanceHistory', 'Attendance History', {})}
                        className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center hover:bg-purple-200 transition-colors active:scale-95"
                        title="View Attendance History"
                    >
                        <CalendarIcon className="h-6 w-6 text-purple-600" />
                    </button>
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
                            {(todayStatus.approval_status || 'Pending').charAt(0).toUpperCase() + (todayStatus.approval_status || 'Pending').slice(1)}
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
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(record.approval_status)}`}>
                                    {(record.approval_status || 'Pending').charAt(0).toUpperCase() + (record.approval_status || 'Pending').slice(1)}
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
