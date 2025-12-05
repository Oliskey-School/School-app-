import React, { useState, useMemo } from 'react';
import { mockStudents, mockTeachers, mockClasses } from '../../data';
import { Student, Teacher, ClassInfo } from '../../types';
import DonutChart from '../ui/DonutChart';
import { ChevronRightIcon } from '../../constants';

interface ClassAttendanceSummary extends ClassInfo {
    teacher?: Teacher;
    present: number;
    total: number;
    status: 'Submitted' | 'Pending';
}

interface AttendanceOverviewScreenProps {
    navigateTo: (view: string, title: string, props?: any) => void;
}

const AttendanceOverviewScreen: React.FC<AttendanceOverviewScreenProps> = ({ navigateTo }) => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    // In a real app, this data would be fetched based on the selectedDate
    const attendanceData: ClassAttendanceSummary[] = useMemo(() => {
        return mockClasses.map((classInfo, index) => {
            const studentsInClass = mockStudents.filter(s => s.grade === classInfo.grade && s.section === classInfo.section);
            const presentCount = studentsInClass.filter(s => s.attendanceStatus === 'Present' || s.attendanceStatus === 'Late').length;
            // A simple heuristic to find a teacher for the class
            const teacher = mockTeachers.find(t => t.classes.includes(`${classInfo.grade}${classInfo.section}`));

            return {
                ...classInfo,
                teacher,
                present: presentCount,
                total: studentsInClass.length,
                status: index % 4 === 0 ? 'Pending' : 'Submitted',
            };
        });
    }, [selectedDate]);

    const overallStats = useMemo(() => {
        const totalPresent = attendanceData.reduce((sum, cls) => sum + cls.present, 0);
        const totalStudents = attendanceData.reduce((sum, cls) => sum + cls.total, 0);
        const totalAbsent = mockStudents.filter(s => s.attendanceStatus === 'Absent').length;
        const totalLate = mockStudents.filter(s => s.attendanceStatus === 'Late').length;
        const overallPercentage = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0;
        return { totalPresent, totalAbsent, totalLate, overallPercentage };
    }, [attendanceData]);

    return (
        <div className="flex flex-col h-full bg-gray-100">
            <div className="p-4 bg-white border-b border-gray-200">
                <label htmlFor="attendance-date" className="text-sm font-medium text-gray-700">Select Date</label>
                <input
                    type="date"
                    id="attendance-date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="mt-1 w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                />
            </div>
            
            <div className="p-4 grid grid-cols-2 gap-4">
                 <div className="bg-white p-4 rounded-xl shadow-sm flex items-center space-x-4">
                    <div className="relative">
                        <DonutChart percentage={overallStats.overallPercentage} color="#4f46e5" size={60} strokeWidth={7} />
                        <div className="absolute inset-0 flex items-center justify-center text-lg font-bold text-indigo-800">
                            {overallStats.overallPercentage}%
                        </div>
                    </div>
                    <div>
                        <p className="font-bold text-gray-800">Overall</p>
                        <p className="text-sm text-gray-500">Attendance</p>
                    </div>
                 </div>
                 <div className="bg-white p-4 rounded-xl shadow-sm space-y-1 text-center">
                    <p className="font-bold text-green-600">{overallStats.totalPresent} Present</p>
                    <p className="text-sm font-semibold text-red-600">{overallStats.totalAbsent} Absent</p>
                     <p className="text-sm font-semibold text-blue-600">{overallStats.totalLate} Late</p>
                 </div>
            </div>

            <main className="flex-grow p-4 space-y-3 overflow-y-auto">
                {attendanceData.map(classData => (
                    <button
                        key={classData.id}
                        onClick={() => navigateTo('classAttendanceDetail', `Attendance: Grade ${classData.grade}${classData.section}`, { classInfo: classData })}
                        className="w-full bg-white rounded-xl shadow-sm p-4 text-left hover:ring-2 hover:ring-indigo-300 transition-all"
                    >
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-lg text-gray-800">Grade {classData.grade}{classData.section}</h3>
                                <p className="text-sm text-gray-500">{classData.present}/{classData.total} Present</p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${classData.status === 'Submitted' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                                    {classData.status}
                                </span>
                                <ChevronRightIcon className="text-gray-400" />
                            </div>
                        </div>
                        {classData.teacher && <p className="text-xs text-gray-400 mt-1">Teacher: {classData.teacher.name}</p>}
                    </button>
                ))}
            </main>
        </div>
    );
};

export default AttendanceOverviewScreen;
