import React, { useState, useEffect } from 'react';
import {
    submitTeacherAttendance,
    getTeacherAttendanceHistory,
    getTodayAttendanceStatus,
    TeacherAttendance,
} from '../../lib/teacherAttendanceService';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { CheckCircleIcon, ClockIcon, XCircleIcon, CalendarIcon } from '../../constants';

interface TeacherSelfAttendanceProps {
    navigateTo: (view: string, title: string, props?: any) => void;
    teacherId?: number | null;
}

const TeacherSelfAttendance: React.FC<TeacherSelfAttendanceProps> = ({ navigateTo, teacherId }) => {
    const [todayStatus, setTodayStatus] = useState<TeacherAttendance | null>(null);
    const [attendanceHistory, setAttendanceHistory] = useState<TeacherAttendance[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (teacherId) {
            loadAttendanceData();
        }
    }, [teacherId]);

    const loadAttendanceData = async () => {
        if (!teacherId) return;

        setLoading(true);
        try {
            // Get today's status
            const todayResult = await getTodayAttendanceStatus(teacherId);
            if (todayResult.success && todayResult.data) {
                setTodayStatus(todayResult.data);
            }

            // Get attendance history
            const historyResult = await getTeacherAttendanceHistory(teacherId, 30);
            if (historyResult.success && historyResult.data) {
                setAttendanceHistory(historyResult.data);
            }
        } catch (error) {
            console.error('Error loading attendance data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!teacherId) return;

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
                (payload) => {
                    console.log('Real-time update received for teacher attendance:', payload);
                    // Refresh data on any change (insert, update, delete)
                    loadAttendanceDataRef.current();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [teacherId]);

    // Use ref to avoid stale closure in subscription callback if we called loadAttendanceData directly
    const loadAttendanceDataRef = React.useRef(loadAttendanceData);
    useEffect(() => {
        loadAttendanceDataRef.current = loadAttendanceData;
    }, [loadAttendanceData]);

    const handleCheckIn = async () => {
        if (!teacherId) {
            toast.error("Teacher profile not found. Please contact admin.");
            return;
        }

        setSubmitting(true);
        try {
            const result = await submitTeacherAttendance(teacherId);
            if (result.success) {
                toast.success('Attendance submitted successfully! Waiting for admin approval.');
                loadAttendanceData();
            } else {
                toast.error(`Failed to submit attendance: ${result.error}`);
            }
        } catch (error) {
            console.error('Error submitting attendance:', error);
            toast.error('An error occurred while submitting attendance.');
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Approved':
                return (
                    <div className="flex items-center space-x-1 text-green-600">
                        <CheckCircleIcon className="h-5 w-5" />
                        <span className="font-semibold">Approved</span>
                    </div>
                );
            case 'Pending':
                return (
                    <div className="flex items-center space-x-1 text-amber-600">
                        <ClockIcon className="h-5 w-5" />
                        <span className="font-semibold">Pending</span>
                    </div>
                );
            case 'Rejected':
                return (
                    <div className="flex items-center space-x-1 text-red-600">
                        <XCircleIcon className="h-5 w-5" />
                        <span className="font-semibold">Rejected</span>
                    </div>
                );
            default:
                return null;
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const formatTime = (timeString: string) => {
        const time = new Date(timeString);
        return time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex flex-col h-full bg-gray-100">
            <main className="flex-grow flex flex-col overflow-y-auto">
                {/* Today's Status Card */}
                <div className="p-4 bg-white border-b border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h3 className="font-bold text-lg text-gray-800">Today's Attendance</h3>
                            <p className="text-sm text-gray-500">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                        </div>
                        <CalendarIcon className="h-8 w-8 text-purple-600" />
                    </div>

                    {loading ? (
                        <div className="text-center py-4">
                            <p className="text-gray-500">Loading...</p>
                        </div>
                    ) : todayStatus ? (
                        <div className="bg-purple-50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-gray-600">Status:</span>
                                {getStatusBadge(todayStatus.status)}
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Check-in Time:</span>
                                <span className="font-semibold text-gray-800">{formatTime(todayStatus.check_in_time)}</span>
                            </div>
                            {todayStatus.status === 'Rejected' && todayStatus.rejection_reason && (
                                <div className="mt-3 p-2 bg-red-50 rounded border border-red-200">
                                    <p className="text-xs text-red-700">
                                        <strong>Reason:</strong> {todayStatus.rejection_reason}
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <button
                            onClick={handleCheckIn}
                            disabled={submitting}
                            className={`w-full py-3 rounded-lg font-bold text-white transition-all ${submitting
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-purple-600 hover:bg-purple-700 active:scale-95'
                                }`}
                        >
                            {submitting ? 'Submitting...' : '✓ Mark Attendance (Check In)'}
                        </button>
                    )}
                </div>

                {/* Attendance History */}
                <div className="flex-grow p-4">
                    <h3 className="font-bold text-lg text-gray-800 mb-3">Attendance History</h3>

                    {attendanceHistory.length === 0 ? (
                        <div className="text-center py-10">
                            <p className="text-gray-500">No attendance records yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {attendanceHistory.map((record) => (
                                <div key={record.id} className="bg-white rounded-lg shadow-sm p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-semibold text-gray-800">{formatDate(record.date)}</span>
                                        {getStatusBadge(record.status)}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        <p>Check-in: {formatTime(record.check_in_time)}</p>
                                        {record.approved_at && (
                                            <p className="mt-1">
                                                {record.status === 'Approved' ? 'Approved' : 'Rejected'} on: {formatDate(record.approved_at)}
                                            </p>
                                        )}
                                    </div>
                                    {record.status === 'Rejected' && record.rejection_reason && (
                                        <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
                                            <p className="text-xs text-red-700">
                                                <strong>Reason:</strong> {record.rejection_reason}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default TeacherSelfAttendance;
