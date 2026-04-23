import React, { useState, useMemo, useEffect } from 'react';
import { Teacher } from '../../types';
import { ChevronLeftIcon, ChevronRightIcon } from '../../constants';
import { api } from '../../lib/api';
import { useAutoSync } from '../../hooks/useAutoSync';

type AttendanceStatus = 'Present' | 'Absent' | 'Leave' | 'Pending';

const TeacherAttendanceDetail: React.FC<{ teacher: Teacher }> = ({ teacher }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [attendanceMap, setAttendanceMap] = useState<Map<string, AttendanceStatus>>(new Map());
    const [loading, setLoading] = useState(true);

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

    const goToPreviousMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const goToNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    const attendanceColors: { [key in AttendanceStatus]: string } = {
        Present: 'bg-green-400 text-white',
        Absent: 'bg-red-400 text-white',
        Leave: 'bg-amber-400 text-white',
        Pending: 'bg-yellow-400 text-white',
    };

    const stats = useMemo(() => {
        let present = 0, absent = 0, leave = 0;
        attendanceMap.forEach(status => {
            if (status === 'Present') present++;
            if (status === 'Absent') absent++;
            if (status === 'Leave') leave++;
        });
        return { present, absent, leave };
    }, [attendanceMap]);

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
                            const status = attendanceMap.get(dateString);
                            return (
                                <div key={day} className={`w-9 h-9 flex items-center justify-center rounded-full text-sm font-semibold ${status ? attendanceColors[status] : 'bg-gray-100 text-gray-400'}`}>
                                    {day}
                                </div>
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
                <div className="bg-white p-3 rounded-xl shadow-sm"><p className="font-bold text-lg text-green-600">{stats.present}</p><p className="text-xs text-gray-500">Present</p></div>
                <div className="bg-white p-3 rounded-xl shadow-sm"><p className="font-bold text-lg text-red-600">{stats.absent}</p><p className="text-xs text-gray-500">Absent</p></div>
                <div className="bg-white p-3 rounded-xl shadow-sm"><p className="font-bold text-lg text-amber-600">{stats.leave}</p><p className="text-xs text-gray-500">On Leave</p></div>
            </div>
        </div>
    );
};

export default TeacherAttendanceDetail;
