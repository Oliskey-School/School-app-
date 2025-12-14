import React, { useState, useMemo, useEffect } from 'react';
import { StudentAttendance, AttendanceStatus } from '../../types';
import { supabase } from '../../lib/supabase';
import { ChevronLeftIcon, ChevronRightIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from '../../constants';
import DonutChart from '../ui/DonutChart';

const attendanceColors: { [key in AttendanceStatus]: string } = {
    Present: 'bg-green-400 text-white',
    Absent: 'bg-red-400 text-white',
    Late: 'bg-blue-400 text-white',
    Leave: 'bg-gray-200 text-gray-500', // For weekends/holidays
};

const SimpleLineChart = ({ data, color }: { data: { month: string, percentage: number }[], color: string }) => {
    const width = 320;
    const height = 150;
    const padding = 30;
    const maxValue = 100;
    const stepX = (width - padding * 2) / (data.length - 1);
    const stepY = (height - padding * 2) / maxValue;
    const points = data.map((d, i) => `${padding + i * stepX},${height - padding - d.percentage * stepY}`).join(' ');

    return (
        <div className="relative">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
                {/* Y-axis lines and labels */}
                {[0, 25, 50, 75, 100].map(val => (
                    <g key={val}>
                        <line x1={padding} y1={height - padding - val * stepY} x2={width - padding} y2={height - padding - val * stepY} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="2" />
                        <text x={padding - 5} y={height - padding - val * stepY + 3} textAnchor="end" fontSize="10" fill="#6b7280">{val}%</text>
                    </g>
                ))}

                <polyline fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
                {data.map((d, i) => (
                    <circle key={i} cx={padding + i * stepX} cy={height - padding - d.percentage * stepY} r="4" fill="white" stroke={color} strokeWidth="2" />
                ))}
            </svg>
            <div className="flex justify-between -mt-4" style={{ paddingLeft: `${padding - 10}px`, paddingRight: `${padding - 10}px` }}>
                {data.map(item => <span key={item.month} className="text-xs text-gray-500 font-medium">{item.month}</span>)}
            </div>
        </div>
    );
};


interface AttendanceScreenProps {
    studentId: number;
}

const AttendanceScreen: React.FC<AttendanceScreenProps> = ({ studentId }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [attendanceData, setAttendanceData] = useState<StudentAttendance[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAttendance = async () => {
            // Mock fallback for now to ensure UI shows something if table is empty, 
            // but strictly we should fetch.
            try {
                const { data, error } = await supabase
                    .from('student_attendance')
                    .select('*')
                    .eq('student_id', studentId);

                if (error) throw error;
                if (data) {
                    // Map to ensure it matches StudentAttendance type if needed, 
                    // assuming DB columns match: id, studentId, date, status, remarks
                    // If DB uses snack_case (student_id), we might need to map.
                    const formatted: StudentAttendance[] = data.map((d: any) => ({
                        id: d.id,
                        studentId: d.student_id,
                        date: d.date,
                        status: d.status,
                        remarks: d.remarks
                    }));
                    setAttendanceData(formatted);
                }
            } catch (err) {
                console.error('Error fetching attendance:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchAttendance();
    }, [studentId]);

    const studentData = useMemo(() => attendanceData, [attendanceData]);

    const attendanceMap = useMemo(() => {
        const map = new Map<string, AttendanceStatus>();
        studentData.forEach(att => map.set(att.date, att.status));
        return map;
    }, [studentData]);

    const firstDayOfMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), [currentDate]);
    const daysInMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate(), [currentDate]);
    const startingDayIndex = firstDayOfMonth.getDay();

    const goToPreviousMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const goToNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    const monthlyStats = useMemo(() => {
        let present = 0, absent = 0, late = 0, leave = 0;
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const dateString = date.toISOString().split('T')[0];
            const status = attendanceMap.get(dateString);
            if (status === 'Present') present++;
            else if (status === 'Absent') absent++;
            else if (status === 'Late') late++;
            else if (status === 'Leave') leave++;
        }
        return { present, absent, late, leave };
    }, [currentDate, attendanceMap, daysInMonth]);

    const termStats = useMemo(() => {
        const schoolDays = studentData.filter(d => d.status !== 'Leave');
        const presentDays = schoolDays.filter(d => d.status === 'Present' || d.status === 'Late').length;
        const percentage = schoolDays.length > 0 ? Math.round((presentDays / schoolDays.length) * 100) : 0;

        const monthlyTrends: { [month: string]: { present: number, total: number } } = {};
        studentData.forEach(d => {
            if (d.status !== 'Leave') {
                const month = new Date(d.date).toLocaleString('default', { month: 'short' });
                if (!monthlyTrends[month]) {
                    monthlyTrends[month] = { present: 0, total: 0 };
                }
                monthlyTrends[month].total++;
                if (d.status === 'Present' || d.status === 'Late') {
                    monthlyTrends[month].present++;
                }
            }
        });

        const trendData = Object.entries(monthlyTrends)
            .map(([month, data]) => ({ month, percentage: Math.round((data.present / data.total) * 100) }))
            // This is a simplistic sort, a better one would handle year changes
            .sort((a, b) => new Date(`1 ${a.month} 2024`) > new Date(`1 ${b.month} 2024`) ? 1 : -1)
            .slice(-4); // Get last 4 months

        return { percentage, trendData };

    }, [studentData]);

    if (loading) return <div className="p-8 text-center text-gray-500">Loading attendance data...</div>;

    return (
        <div className="p-4 space-y-5 bg-gray-50">
            {/* Calendar */}
            <div className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex justify-between items-center mb-4">
                    <button onClick={goToPreviousMonth} className="p-2 rounded-full hover:bg-gray-100" aria-label="Previous month"><ChevronLeftIcon className="h-5 w-5 text-gray-600" /></button>
                    <h3 className="font-bold text-lg text-gray-800">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
                    <button onClick={goToNextMonth} className="p-2 rounded-full hover:bg-gray-100" aria-label="Next month"><ChevronRightIcon /></button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-500 mb-2">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => <div key={day}>{day}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-2">
                    {Array.from({ length: startingDayIndex }).map((_, index) => <div key={`empty-${index}`} />)}
                    {Array.from({ length: daysInMonth }).map((_, index) => {
                        const day = index + 1;
                        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                        const dateString = date.toISOString().split('T')[0];
                        const status = attendanceMap.get(dateString);
                        return (
                            <div key={day} className={`w-9 h-9 flex items-center justify-center rounded-full text-sm font-semibold ${status ? attendanceColors[status] : 'bg-gray-100 text-gray-400'}`}>
                                {day}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Monthly Stats */}
            <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-white p-3 rounded-xl shadow-sm"><p className="font-bold text-lg text-green-600">{monthlyStats.present}</p><p className="text-xs text-gray-500">Present</p></div>
                <div className="bg-white p-3 rounded-xl shadow-sm"><p className="font-bold text-lg text-red-600">{monthlyStats.absent}</p><p className="text-xs text-gray-500">Absent</p></div>
                <div className="bg-white p-3 rounded-xl shadow-sm"><p className="font-bold text-lg text-blue-600">{monthlyStats.late}</p><p className="text-xs text-gray-500">Late</p></div>
            </div>

            {/* Term Trend */}
            <div className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-gray-800">Term Attendance Trend</h3>
                    <div className="relative">
                        <DonutChart percentage={termStats.percentage} color="#FF9800" size={60} strokeWidth={7} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-lg font-bold text-gray-800">{termStats.percentage}%</span>
                        </div>
                    </div>
                </div>
                <SimpleLineChart data={termStats.trendData} color="#FF9800" />
            </div>
        </div>
    );
};

export default AttendanceScreen;