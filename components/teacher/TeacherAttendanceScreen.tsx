


import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { CheckCircleIcon, XCircleIcon } from '../../constants';
// import { mockStudents } from '../../data';
import DonutChart from '../ui/DonutChart';
import { THEME_CONFIG } from '../../constants';
import { DashboardType, Student, AttendanceStatus, ClassInfo } from '../../types';
import { getFormattedClassName } from '../../constants';
import { supabase } from '../../lib/supabase';


const AttendanceStatusButtons = ({ status, onStatusChange }: { status: AttendanceStatus, onStatusChange: (newStatus: AttendanceStatus) => void }) => {
    const statusOptions: AttendanceStatus[] = ['Present', 'Absent', 'Late', 'Leave'];
    const statusStyles: { [key in AttendanceStatus]: { button: string, text: string } } = {
        Present: { button: 'bg-green-100 text-green-700 ring-green-500', text: 'P' },
        Absent: { button: 'bg-red-100 text-red-700 ring-red-500', text: 'A' },
        Late: { button: 'bg-blue-100 text-blue-700 ring-blue-500', text: 'L' },
        Leave: { button: 'bg-amber-100 text-amber-700 ring-amber-500', text: 'Lv' },
    };

    return (
        <div className="flex items-center space-x-1">
            {statusOptions.map(option => (
                <button
                    key={option}
                    onClick={() => onStatusChange(option)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1 ${status === option
                            ? statusStyles[option].button
                            : 'bg-gray-200 text-gray-600'
                        }`}
                >
                    {statusStyles[option].text}
                </button>
            ))}
        </div>
    );
};

interface TeacherMarkAttendanceScreenProps {
    classInfo: ClassInfo;
}

const TeacherMarkAttendanceScreen: React.FC<TeacherMarkAttendanceScreenProps> = ({ classInfo }) => {
    const theme = THEME_CONFIG[DashboardType.Teacher];
    const [students, setStudents] = useState<Student[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch students and todys attendance
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // 1. Fetch Students in Class
                const { data: classStudents, error: studentError } = await supabase
                    .from('students')
                    .select('*')
                    .eq('grade', classInfo.grade)
                    .eq('section', classInfo.section);

                if (studentError) throw studentError;

                if (!classStudents || classStudents.length === 0) {
                    setStudents([]);
                    return;
                }

                // 2. Fetch Existing Attendance for Today
                const today = new Date().toISOString().split('T')[0];
                const { data: attendanceData } = await supabase
                    .from('student_attendance')
                    .select('*')
                    .in('student_id', classStudents.map(s => s.id))
                    .eq('date', today);

                // Map API data to UI model
                const studentsWithAttendance = classStudents.map((s: any) => {
                    const record = attendanceData?.find(a => a.student_id === s.id);
                    return {
                        id: s.id,
                        name: s.name,
                        grade: s.grade,
                        section: s.section,
                        avatarUrl: s.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=random`,
                        attendanceStatus: (record?.status || 'Absent') as AttendanceStatus, // Default to Absent if no record? Or maybe 'Present'? Defaulting to Absent for now as safety.
                        // Add other fields to satisfy Student type if needed, or cast
                        // For now just partial
                    } as unknown as Student;
                });

                setStudents(studentsWithAttendance);

            } catch (err) {
                console.error("Error fetching attendance data:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [classInfo]);


    const handleStatusChange = useCallback((studentId: number, status: AttendanceStatus) => {
        setStudents(currentStudents =>
            currentStudents.map(student =>
                student.id === studentId ? { ...student, attendanceStatus: status } : student
            )
        );
    }, []);

    const handleMarkAll = useCallback((status: 'Present' | 'Absent') => {
        setStudents(currentStudents =>
            currentStudents.map(student => ({ ...student, attendanceStatus: status }))
        );
    }, []);

    const submitAttendance = async () => {
        const today = new Date().toISOString().split('T')[0];
        const upsertData = students.map(s => ({
            student_id: s.id,
            date: today,
            status: s.attendanceStatus
        }));

        try {
            const { error } = await supabase
                .from('student_attendance')
                .upsert(upsertData, { onConflict: 'student_id,date' });

            if (error) throw error;
            alert('Attendance submitted successfully!');
        } catch (err) {
            console.error('Error submitting attendance:', err);
            alert('Failed to save attendance.');
        }
    };

    const attendanceSummary = useMemo(() => {
        const total = students.length;
        if (total === 0) return { total: 0, present: 0, absent: 0, onLeave: 0, late: 0, presentPercentage: 0 };

        const present = students.filter(s => s.attendanceStatus === 'Present').length;
        const absent = students.filter(s => s.attendanceStatus === 'Absent').length;
        const onLeave = students.filter(s => s.attendanceStatus === 'Leave').length;
        const late = students.filter(s => s.attendanceStatus === 'Late').length;
        const presentPercentage = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

        return { total, present, absent, onLeave, late, presentPercentage };
    }, [students]);

    const formattedClassName = getFormattedClassName(classInfo.grade, classInfo.section);

    if (isLoading) return <div className="p-4 text-center">Loading class data...</div>;

    return (
        <div className="flex flex-col h-full bg-gray-100">
            {/* Summary */}
            <div className="p-4 bg-white border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-bold text-lg text-gray-800">Today's Overview for {formattedClassName}</p>
                        <p className="text-sm text-gray-500">
                            <span className="text-green-600 font-medium">{attendanceSummary.present} Present</span> &bull;
                            <span className="text-blue-500 font-medium"> {attendanceSummary.late} Late</span> &bull;
                            <span className="text-red-600 font-medium"> {attendanceSummary.absent} Absent</span> &bull;
                            <span className="text-amber-600 font-medium"> {attendanceSummary.onLeave} Leave</span>
                        </p>
                    </div>
                    <div className="relative">
                        <DonutChart percentage={attendanceSummary.presentPercentage} color={theme.chartColor} size={70} strokeWidth={8} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-lg font-bold text-gray-800">{attendanceSummary.presentPercentage}%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mark All Buttons */}
            <div className="p-4 grid grid-cols-2 gap-3 bg-gray-100 border-b border-gray-200">
                <button
                    onClick={() => handleMarkAll('Present')}
                    className="w-full flex justify-center items-center space-x-2 py-2 px-4 border border-transparent rounded-lg shadow-sm font-medium text-white bg-green-500 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                    <CheckCircleIcon className="w-5 h-5" />
                    <span>All Present</span>
                </button>
                <button
                    onClick={() => handleMarkAll('Absent')}
                    className="w-full flex justify-center items-center space-x-2 py-2 px-4 border border-transparent rounded-lg shadow-sm font-medium text-white bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                    <XCircleIcon className="w-5 h-5" />
                    <span>All Absent</span>
                </button>
            </div>

            {/* Student List */}
            <main className="flex-grow overflow-y-auto">
                <ul className="divide-y divide-gray-200">
                    {students.map(student => (
                        <li key={student.id} className="p-4 flex items-center justify-between bg-white hover:bg-gray-50">
                            <div className="flex items-center space-x-4">
                                <img src={student.avatarUrl} alt={student.name} className="w-12 h-12 rounded-full object-cover" />
                                <div>
                                    <p className="font-bold text-gray-800">{student.name}</p>
                                    <p className="text-sm text-gray-500">Student ID: SCH-0{student.id}</p>
                                </div>
                            </div>
                            <AttendanceStatusButtons status={student.attendanceStatus} onStatusChange={(newStatus) => handleStatusChange(student.id, newStatus)} />
                        </li>
                    ))}
                    {students.length === 0 && (
                        <div className="text-center py-10 bg-white">
                            <p className="text-gray-500">No students found for this class.</p>
                        </div>
                    )}
                </ul>
            </main>

            {/* Footer */}
            <div className="p-4 bg-white border-t border-gray-200">
                <button
                    onClick={submitAttendance}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                    Submit Attendance
                </button>
            </div>
        </div>
    );
};

export default TeacherMarkAttendanceScreen;
