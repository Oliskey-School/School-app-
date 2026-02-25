import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getTeacherAttendanceHistory, TeacherAttendance } from '../../lib/teacherAttendanceService';
import { CheckCircleIcon, CalendarIcon, ChevronRightIcon } from '../../constants';
import { toast } from 'react-hot-toast';

interface TeacherAttendanceHistoryScreenProps {
    teacherId: string;
    handleBack: () => void;
}

const TeacherAttendanceHistoryScreen: React.FC<TeacherAttendanceHistoryScreenProps> = ({ teacherId, handleBack }) => {
    const [history, setHistory] = useState<TeacherAttendance[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            if (!teacherId) return;
            setLoading(true);
            try {
                const res = await getTeacherAttendanceHistory(teacherId, 100); // Fetch more for history view
                if (res.success) {
                    setHistory(res.data || []);
                } else {
                    toast.error(res.error || "Failed to load history");
                }
            } catch (err) {
                console.error("Error fetching history:", err);
                toast.error("An unexpected error occurred");
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [teacherId]);

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
            <div className="flex flex-col items-center justify-center p-20">
                <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-500 font-medium">Loading history...</p>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-2 px-1">
                <h2 className="text-2xl font-bold text-gray-800">Attendance History</h2>
                <div className="bg-purple-50 text-purple-600 px-3 py-1 rounded-full text-xs font-bold">
                    Last 100 Records
                </div>
            </div>

            {history.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <CalendarIcon className="h-8 w-8 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-700">No Records Found</h3>
                    <p className="text-gray-500 max-w-xs mt-1">You haven't marked your attendance yet. Check-in from the main dashboard.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {history.map((record) => (
                        <div key={record.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-5">
                                <div className="text-center bg-purple-50 rounded-xl p-3 min-w-[70px]">
                                    <p className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                                        {new Date(record.date).toLocaleDateString('en-US', { month: 'short' })}
                                    </p>
                                    <p className="text-2xl font-black text-purple-700">
                                        {new Date(record.date).getDate()}
                                    </p>
                                    <p className="text-[10px] font-medium text-purple-400 mt-1">
                                        {new Date(record.date).toLocaleDateString('en-US', { weekday: 'short' })}
                                    </p>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <CheckCircleIcon className="h-4 w-4 text-green-500" />
                                        <p className="text-lg font-bold text-gray-800">Checked In at {record.check_in}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge status={record.status} />
                                        <span className="text-sm text-gray-500">Year: {new Date(record.date).getFullYear()}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${getStatusColor(record.approval_status)} shadow-sm`}>
                                    {record.approval_status}
                                </span>
                                {record.approved_by && (
                                    <p className="text-[10px] text-gray-400 font-medium italic">Approved by Admin</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const Badge = ({ status }: { status: string }) => {
    return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 capitalize">
            {status || 'Present'}
        </span>
    );
};

export default TeacherAttendanceHistoryScreen;
