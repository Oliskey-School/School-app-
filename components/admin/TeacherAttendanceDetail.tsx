import React, { useState, useMemo, useEffect } from 'react';
import { Teacher } from '../../types';
import { ChevronLeftIcon, ChevronRightIcon, CheckCircleIcon } from '../../constants';
import { api } from '../../lib/api';
import { useAutoSync } from '../../hooks/useAutoSync';
import { toast } from 'react-hot-toast';
import { Save, RotateCcw } from 'lucide-react';

type AttendanceStatus = 'Present' | 'Absent' | 'Leave' | 'Pending';

const TeacherAttendanceDetail: React.FC<{ teacher: Teacher }> = ({ teacher }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [attendanceMap, setAttendanceMap] = useState<Map<string, AttendanceStatus>>(new Map());
    const [pendingChanges, setPendingChanges] = useState<Map<string, AttendanceStatus>>(new Map());
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const firstDayOfMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), [currentDate]);
    const daysInMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate(), [currentDate]);
    const startingDayIndex = firstDayOfMonth.getDay();

    const fetchAttendance = async () => {
        setLoading(true);
        try {
            const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
            const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];
            const schoolId = sessionStorage.getItem('school_id') || '';

            const data = await api.getTeacherAttendance(schoolId, {
                teacher_id: teacher.id,
                startDate,
                endDate
            });

            const map = new Map<string, AttendanceStatus>();
            data?.forEach((record: any) => {
                let status: AttendanceStatus = 'Absent';
                if (record.approval_status === 'approved') status = 'Present';
                else if (record.approval_status === 'pending') status = 'Pending';
                else if (record.status === 'Leave' || record.status === 'excused') status = 'Leave';

                map.set(record.date, status);
            });
            setAttendanceMap(map);
        } catch (err) {
            console.error('Error fetching teacher attendance detail:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAttendance();
    }, [currentDate, teacher.id]);

    useAutoSync(['staff_attendance'], () => {
        console.log('🔄 [TeacherAttendanceDetail] Real-time auto-sync triggered');
        fetchAttendance();
    });

    const goToPreviousMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
        setPendingChanges(new Map());
    };
    const goToNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
        setPendingChanges(new Map());
    };

    const handleDayClick = (dateString: string) => {
        const currentStatus = pendingChanges.get(dateString) || attendanceMap.get(dateString);
        const statuses: (AttendanceStatus | undefined)[] = ['Present', 'Absent', 'Leave', undefined];
        const nextIndex = (statuses.indexOf(currentStatus as any) + 1) % statuses.length;
        const nextStatus = statuses[nextIndex];

        const newPending = new Map(pendingChanges);
        if (nextStatus === attendanceMap.get(dateString)) {
            newPending.delete(dateString);
        } else {
            newPending.set(dateString, nextStatus as AttendanceStatus);
        }
        setPendingChanges(newPending);
    };

    const handleSave = async () => {
        if (pendingChanges.size === 0) return;
        setIsSaving(true);
        const schoolId = sessionStorage.getItem('school_id') || '';
        try {
            const records = Array.from(pendingChanges.entries()).map(([date, status]) => ({
                teacher_id: teacher.id,
                date,
                status: status || 'Absent',
                approval_status: 'approved'
            }));

            await api.saveTeacherAttendance(schoolId, records);
            toast.success(`Successfully updated ${pendingChanges.size} records`);
            setPendingChanges(new Map());
            await fetchAttendance();
        } catch (err) {
            console.error('Error saving attendance:', err);
            toast.error('Failed to save attendance changes');
        } finally {
            setIsSaving(false);
        }
    };

    const attendanceColors: { [key in AttendanceStatus]: string } = {
        Present: 'bg-green-400 text-white',
        Absent: 'bg-red-400 text-white',
        Leave: 'bg-amber-400 text-white',
        Pending: 'bg-yellow-400 text-white',
    };

    const stats = useMemo(() => {
        let present = 0, absent = 0, leave = 0;
        // Combine map and pending
        const combined = new Map(attendanceMap);
        pendingChanges.forEach((status, date) => {
            if (status) combined.set(date, status);
            else combined.delete(date);
        });

        combined.forEach(status => {
            if (status === 'Present') present++;
            if (status === 'Absent') absent++;
            if (status === 'Leave') leave++;
        });
        return { present, absent, leave };
    }, [attendanceMap, pendingChanges]);

    return (
        <div className="p-4 bg-gray-50 space-y-4">
            <div className="bg-white p-4 rounded-xl shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <button onClick={goToPreviousMonth} className="p-2 rounded-full hover:bg-gray-100"><ChevronLeftIcon className="h-5 w-5 text-gray-600" /></button>
                    <h3 className="font-bold text-lg text-gray-800">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
                    <button onClick={goToNextMonth} className="p-2 rounded-full hover:bg-gray-100"><ChevronRightIcon className="h-5 w-5 text-gray-600" /></button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-500 mb-2">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => <div key={`${day}-${i}`}>{day}</div>)}
                </div>
                {loading ? (
                    <div className="flex justify-center py-10"><div className="animate-spin h-8 w-8 border-4 border-indigo-500 rounded-full border-t-transparent"></div></div>
                ) : (
                    <div className="grid grid-cols-7 gap-2">
                        {Array.from({ length: startingDayIndex }).map((_, index) => <div key={`empty-${index}`} />)}
                        {Array.from({ length: daysInMonth }).map((_, index) => {
                            const day = index + 1;
                            const dateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const status = pendingChanges.has(dateString) ? pendingChanges.get(dateString) : attendanceMap.get(dateString);
                            const isPending = pendingChanges.has(dateString);
                            
                            return (
                                <button
                                    key={day}
                                    onClick={() => handleDayClick(dateString)}
                                    className={`w-9 h-9 flex items-center justify-center rounded-full text-sm font-semibold transition-all ${
                                        status ? attendanceColors[status] : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                    } ${isPending ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110 shadow-md' : 'hover:scale-105'}`}
                                >
                                    {day}
                                </button>
                            )
                        })}
                    </div>
                )}
                <div className="flex justify-center space-x-3 mt-4 text-xs">
                    <span className="flex items-center"><div className="w-3 h-3 rounded-full bg-green-400 mr-1.5"></div>Present</span>
                    <span className="flex items-center"><div className="w-3 h-3 rounded-full bg-yellow-400 mr-1.5"></div>Pending</span>
                    <span className="flex items-center"><div className="w-3 h-3 rounded-full bg-red-400 mr-1.5"></div>Absent</span>
                    <span className="flex items-center"><div className="w-3 h-3 rounded-full bg-amber-400 mr-1.5"></div>Leave</span>
                </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-white p-3 rounded-xl shadow-sm border border-transparent hover:border-green-100 transition-colors">
                    <p className="font-bold text-lg text-green-600">{stats.present}</p>
                    <p className="text-xs text-gray-500">Present</p>
                </div>
                <div className="bg-white p-3 rounded-xl shadow-sm border border-transparent hover:border-red-100 transition-colors">
                    <p className="font-bold text-lg text-red-600">{stats.absent}</p>
                    <p className="text-xs text-gray-500">Absent</p>
                </div>
                <div className="bg-white p-3 rounded-xl shadow-sm border border-transparent hover:border-amber-100 transition-colors">
                    <p className="font-bold text-lg text-amber-600">{stats.leave}</p>
                    <p className="text-xs text-gray-500">On Leave</p>
                </div>
            </div>

            {pendingChanges.size > 0 && (
                <div className="flex gap-3 pt-2">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-indigo-700 active:scale-95 transition-all disabled:bg-indigo-300"
                    >
                        {isSaving ? (
                            <div className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent"></div>
                        ) : (
                            <Save className="w-5 h-5" />
                        )}
                        <span>Save Attendance ({pendingChanges.size})</span>
                    </button>
                    <button
                        onClick={() => setPendingChanges(new Map())}
                        disabled={isSaving}
                        className="p-3 bg-gray-200 text-gray-600 rounded-xl hover:bg-gray-300 active:scale-95 transition-all disabled:opacity-50"
                        title="Reset changes"
                    >
                        <RotateCcw className="w-5 h-5" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default TeacherAttendanceDetail;
