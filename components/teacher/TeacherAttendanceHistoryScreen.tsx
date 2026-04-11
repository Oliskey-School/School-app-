import React, { useState, useEffect } from 'react';
import { CheckCircleIcon, CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '../../constants';
import { toast } from 'react-hot-toast';
import { api } from '../../lib/api';

interface TeacherAttendance {
    id: string;
    teacher_id: string;
    date: string;
    status: string;
    approval_status: string;
    check_in: string;
    approved_by?: string;
}

interface TeacherAttendanceHistoryScreenProps {
    teacherId?: string | null;
    handleBack: () => void;
}

const TeacherAttendanceHistoryScreen: React.FC<TeacherAttendanceHistoryScreenProps> = ({ teacherId, handleBack }) => {
    const [history, setHistory] = useState<TeacherAttendance[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [attendanceMap, setAttendanceMap] = useState<Map<string, string>>(new Map());
    const [calendarLoading, setCalendarLoading] = useState(false);

    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const startingDayIndex = firstDayOfMonth.getDay();

    const fetchCalendarData = async () => {
        setCalendarLoading(true);
        try {
            const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
            const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];

            // Use unified API client for teacher attendance
            const data = await api.getTeacherAttendance('', {
                startDate,
                endDate,
                teacher_id: teacherId || undefined
            });

            const map = new Map<string, string>();
            data?.forEach((record: any) => {
                let displayStatus = 'Present';
                if (record.approval_status === 'rejected') displayStatus = 'Absent';
                else if (record.approval_status === 'pending') displayStatus = 'Pending';
                else if (record.status === 'Leave' || record.status === 'On Leave' || record.status === 'excused') displayStatus = 'Leave';

                map.set(record.date, displayStatus);
            });
            setAttendanceMap(map);
        } catch (err) {
            console.error('Error fetching calendar data:', err);
        } finally {
            setCalendarLoading(false);
        }
    };

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            try {
                const data = await api.getTeacherAttendanceHistory(100);
                setHistory(data || []);
            } catch (err: any) {
                console.error("Error fetching history:", err);
                toast.error(err.message || "Failed to load history");
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
        fetchCalendarData();
    }, [teacherId, currentDate]);

    useEffect(() => {
        const handleRealtimeUpdate = (event: any) => {
            const { table } = event.detail;
            if (table === 'teacher_attendance') {
                console.log('🔄 [History] Realtime update detected, refreshing...');
                const fetchHistory = async () => {
                    try {
                        const data = await api.getTeacherAttendanceHistory(100);
                        setHistory(data || []);
                    } catch (err: any) {
                        console.error("Error fetching history:", err);
                    }
                };
                fetchHistory();
                fetchCalendarData();
            }
        };

        window.addEventListener('realtime-update', handleRealtimeUpdate);
        return () => window.removeEventListener('realtime-update', handleRealtimeUpdate);
    }, []);

    const goToPreviousMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const goToNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    const attendanceColors: { [key: string]: string } = {
        Present: 'bg-green-400 text-white',
        Absent: 'bg-red-400 text-white',
        Leave: 'bg-amber-400 text-white',
        Pending: 'bg-yellow-400 text-white',
    };

    const stats = React.useMemo(() => {
        let present = 0, absent = 0, leave = 0;
        attendanceMap.forEach(status => {
            if (status === 'Present') present++;
            if (status === 'Absent') absent++;
            if (status === 'Leave') leave++;
        });
        return { present, absent, leave };
    }, [attendanceMap]);

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
            {/* Calendar & Stats Section */}
            <div className="grid md:grid-cols-2 gap-6 items-start">
                {/* Calendar Card */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <button onClick={goToPreviousMonth} className="p-2 rounded-full hover:bg-gray-50 text-gray-400">
                            <ChevronLeftIcon className="h-6 w-6" />
                        </button>
                        <h3 className="font-black text-xl text-gray-800 tracking-tight">
                            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </h3>
                        <button onClick={goToNextMonth} className="p-2 rounded-full hover:bg-gray-50 text-gray-400">
                            <ChevronRightIcon className="h-6 w-6" />
                        </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => <div key={`day-header-${i}`}>{day}</div>)}
                    </div>

                    {calendarLoading ? (
                        <div className="flex justify-center py-20 min-h-[250px]">
                            <div className="animate-spin h-8 w-8 border-4 border-purple-500 rounded-full border-t-transparent"></div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-7 gap-3">
                            {Array.from({ length: startingDayIndex }).map((_, index) => <div key={`empty-${index}`} />)}
                            {Array.from({ length: daysInMonth }).map((_, index) => {
                                const day = index + 1;
                                const dateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                const status = attendanceMap.get(dateString);
                                return (
                                    <div key={day} className={`aspect-square flex items-center justify-center rounded-full text-sm font-black transition-all ${status ? attendanceColors[status] : 'text-gray-300 hover:bg-gray-50'}`}>
                                        {day}
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    <div className="flex justify-center flex-wrap gap-4 mt-8 pb-2">
                        <span className="flex items-center text-[10px] font-black uppercase text-gray-500 tracking-wider">
                            <div className="w-2.5 h-2.5 rounded-full bg-green-400 mr-2 shadow-sm"></div>Present
                        </span>
                        <span className="flex items-center text-[10px] font-black uppercase text-gray-500 tracking-wider">
                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 mr-2 shadow-sm"></div>Pending
                        </span>
                        <span className="flex items-center text-[10px] font-black uppercase text-gray-500 tracking-wider">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-400 mr-2 shadow-sm"></div>Absent
                        </span>
                        <span className="flex items-center text-[10px] font-black uppercase text-gray-500 tracking-wider">
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 mr-2 shadow-sm"></div>Leave
                        </span>
                    </div>
                </div>

                {/* Vertical Stats & Additional Content */}
                <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-50 text-center group hover:border-green-100 transition-colors">
                            <p className="font-black text-3xl text-green-500 mb-1 leading-none">{stats.present}</p>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Present</p>
                        </div>
                        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-50 text-center group hover:border-red-100 transition-colors">
                            <p className="font-black text-3xl text-red-500 mb-1 leading-none">{stats.absent}</p>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Absent</p>
                        </div>
                        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-50 text-center group hover:border-amber-100 transition-colors">
                            <p className="font-black text-3xl text-amber-500 mb-1 leading-none">{stats.leave}</p>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">On Leave</p>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-6 rounded-3xl shadow-lg shadow-purple-100 text-white relative overflow-hidden">
                        <div className="relative z-10">
                            <h4 className="font-black text-lg mb-1 tracking-tight">Stay Consistent!</h4>
                            <p className="text-purple-100 text-xs font-medium leading-relaxed opacity-90">Every check-in reflects your commitment to excellence.</p>
                        </div>
                        <div className="absolute -right-4 -bottom-4 opacity-10 bg-white w-24 h-24 rounded-full"></div>
                        <CalendarIcon className="absolute right-4 top-4 w-12 h-12 text-white opacity-10" />
                    </div>
                </div>
            </div>

            <div className="pt-6 border-t border-gray-100">
                <div className="flex items-center justify-between mb-6 px-1">
                    <h2 className="text-2xl font-black text-gray-800 tracking-tight">Attendance History</h2>
                    <div className="bg-purple-50 text-purple-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-purple-100">
                        Last 100 Records
                    </div>
                </div>

                {history.length === 0 ? (
                    <div className="bg-white rounded-3xl p-16 shadow-sm border border-gray-50 flex flex-col items-center justify-center text-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                            <CalendarIcon className="h-10 w-10 text-gray-300" />
                        </div>
                        <h3 className="text-xl font-black text-gray-700">No Records Found</h3>
                        <p className="text-gray-400 max-w-xs mt-2 font-medium">You haven't marked your attendance yet. Check-in from the main dashboard.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {history.map((record) => (
                            <div key={record.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-50 flex items-center justify-between hover:shadow-xl hover:scale-[1.01] transition-all duration-300">
                                <div className="flex items-center gap-6">
                                    <div className="text-center bg-purple-50 rounded-2xl p-4 min-w-[85px] border border-purple-100 shadow-sm">
                                        <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-1">
                                            {new Date(record.date).toLocaleDateString('en-US', { month: 'short' })}
                                        </p>
                                        <p className="text-3xl font-black text-purple-700 leading-none">
                                            {new Date(record.date).getDate()}
                                        </p>
                                        <p className="text-[10px] font-black text-purple-400 mt-2 uppercase tracking-widest">
                                            {new Date(record.date).toLocaleDateString('en-US', { weekday: 'short' })}
                                        </p>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"></div>
                                            <p className="text-xl font-black text-gray-800 tracking-tight">Checked In at {record.check_in}</p>
                                        </div>
                                        <div className="flex items-center gap-3 pl-5">
                                            <Badge status={record.status} />
                                            <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                                            <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Year: {new Date(record.date).getFullYear()}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-3">
                                    <span className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusColor(record.approval_status)} shadow-sm border border-current opacity-80`}>
                                        {record.approval_status}
                                    </span>
                                    {record.approved_by && (
                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 rounded-full">
                                            <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Approved by Admin</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const Badge = ({ status }: { status: string }) => {
    return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-100">
            {status || 'Present'}
        </span>
    );
};

export default TeacherAttendanceHistoryScreen;

