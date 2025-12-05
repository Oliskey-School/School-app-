import React, { useState, useMemo, useCallback } from 'react';
import { SearchIcon } from '../../constants';
import { mockTeachers } from '../../data';
import DonutChart from '../ui/DonutChart';
import { THEME_CONFIG } from '../../constants';
import { DashboardType, Teacher } from '../../types';

type AttendanceStatus = 'Present' | 'Absent' | 'Leave';

interface TeacherWithAttendance extends Teacher {
    attendanceStatus: AttendanceStatus;
}

interface TeacherAttendanceScreenProps {
    navigateTo: (view: string, title: string, props?: any) => void;
}

const TeacherAttendanceScreen: React.FC<TeacherAttendanceScreenProps> = ({ navigateTo }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const theme = THEME_CONFIG[DashboardType.Admin];
    const [teachers, setTeachers] = useState<TeacherWithAttendance[]>(() => 
        mockTeachers.map((teacher, index) => ({
            ...teacher,
            // Set some default varied statuses for demonstration
            attendanceStatus: index % 10 === 0 ? 'Absent' : (index % 15 === 0 ? 'Leave' : 'Present'),
        }))
    );
    
    const handleStatusChange = useCallback((teacherId: number, status: AttendanceStatus) => {
        setTeachers(currentTeachers =>
            currentTeachers.map(teacher =>
                teacher.id === teacherId ? { ...teacher, attendanceStatus: status } : teacher
            )
        );
    }, []);

    const filteredTeachers = useMemo(() =>
        teachers.filter(teacher =>
            teacher.name.toLowerCase().includes(searchTerm.toLowerCase())
        ), [teachers, searchTerm]
    );

    const attendanceSummary = useMemo(() => {
        const total = teachers.length;
        const present = teachers.filter(t => t.attendanceStatus === 'Present').length;
        const absent = teachers.filter(t => t.attendanceStatus === 'Absent').length;
        const onLeave = teachers.filter(t => t.attendanceStatus === 'Leave').length;
        const presentPercentage = total > 0 ? Math.round((present / total) * 100) : 0;
        return { total, present, absent, onLeave, presentPercentage };
    }, [teachers]);

    const statusStyles: { [key in AttendanceStatus]: { button: string, text: string } } = {
        Present: { button: 'bg-green-500 text-white', text: 'text-green-600' },
        Absent: { button: 'bg-red-500 text-white', text: 'text-red-600' },
        Leave: { button: 'bg-amber-500 text-white', text: 'text-amber-600' },
    };

    return (
        <div className="flex flex-col h-full bg-gray-100">
            <main className="flex-grow flex flex-col overflow-y-auto">
                {/* Summary Section */}
                <div className="p-4 bg-white">
                    <div className="flex items-center justify-between">
                        <div className="relative">
                            <DonutChart percentage={attendanceSummary.presentPercentage} color={theme.chartColor} size={80} strokeWidth={9} />
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-xl font-bold text-gray-800">{attendanceSummary.presentPercentage}%</span>
                                <span className="text-xs text-gray-500">Present</span>
                            </div>
                        </div>
                        <div className="text-right space-y-1">
                            <p className="font-semibold text-gray-800">{attendanceSummary.present} / {attendanceSummary.total} Present</p>
                            <p className="text-sm text-red-500">{attendanceSummary.absent} Absent</p>
                            <p className="text-sm text-amber-500">{attendanceSummary.onLeave} On Leave</p>
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="p-4 bg-gray-100 z-10 border-b border-t border-gray-200">
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                            <SearchIcon className="text-gray-400" />
                        </span>
                        <input
                            type="text"
                            placeholder="Search by teacher name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg focus:ring-sky-500 focus:border-sky-500"
                            aria-label="Search for a teacher"
                        />
                    </div>
                </div>

                {/* Teacher List */}
                <div className="flex-grow px-4 pb-4 pt-4 space-y-3">
                    {filteredTeachers.length > 0 ? (
                        filteredTeachers.map(teacher => (
                            <div key={teacher.id} className="bg-white rounded-xl shadow-sm p-3 flex items-center space-x-3">
                                <button onClick={() => navigateTo('teacherAttendanceDetail', `${teacher.name}'s Attendance`, { teacher })} className="flex items-center space-x-3 flex-grow text-left">
                                    <img src={teacher.avatarUrl} alt={teacher.name} className="w-12 h-12 rounded-full object-cover" />
                                    <div className="flex-grow">
                                        <p className="font-bold text-gray-800">{teacher.name}</p>
                                        <p className={`text-sm font-semibold ${statusStyles[teacher.attendanceStatus].text}`}>
                                            Status: {teacher.attendanceStatus}
                                        </p>
                                    </div>
                                </button>
                                <div className="flex items-center space-x-2">
                                    {(['Present', 'Absent', 'Leave'] as AttendanceStatus[]).map(status => (
                                        <button
                                            key={status}
                                            onClick={(e) => { e.stopPropagation(); handleStatusChange(teacher.id, status)}}
                                            className={`w-10 h-8 rounded-lg text-xs font-bold transition-transform transform hover:scale-110 ${
                                                teacher.attendanceStatus === status 
                                                ? statusStyles[status].button
                                                : 'bg-gray-200 text-gray-600'
                                            }`}
                                            aria-label={`Mark ${teacher.name} as ${status}`}
                                        >
                                            {status.charAt(0)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-10">
                            <p className="text-gray-500">No teachers found.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default TeacherAttendanceScreen;
