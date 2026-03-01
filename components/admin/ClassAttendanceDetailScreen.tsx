
import React, { useMemo, useState, useEffect } from 'react';
import { Student, ClassInfo, AttendanceStatus } from '../../types';
import { fetchStudentsByClass } from '../../lib/database';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import DonutChart from '../ui/DonutChart';
import { CheckCircleIcon, XCircleIcon, ClockIcon, ExclamationCircleIcon, CalendarIcon } from '../../constants';

interface ClassAttendanceDetailScreenProps {
    classInfo: ClassInfo & { present: number; total: number; id: string };
    currentBranchId?: string | null;
}

const AttendanceStatusIndicator: React.FC<{ status: AttendanceStatus }> = ({ status }) => {
    const styles = {
        Present: { icon: <CheckCircleIcon className="w-5 h-5 text-green-500" />, text: 'text-green-700' },
        Absent: { icon: <XCircleIcon className="w-5 h-5 text-red-500" />, text: 'text-red-700' },
        Late: { icon: <ClockIcon className="w-5 h-5 text-blue-500" />, text: 'text-blue-700' },
        Leave: { icon: <ExclamationCircleIcon className="w-5 h-5 text-orange-500" />, text: 'text-orange-700' },
    };
    // Normalize status to match keys
    const normalizedStatus = (status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()) as AttendanceStatus;
    const { icon, text } = styles[normalizedStatus] || styles['Absent'];
    
    return (
        <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-sm font-semibold bg-gray-100 ${text}`}>
            {icon}
            <span>{normalizedStatus}</span>
        </div>
    );
};

const ClassAttendanceDetailScreen: React.FC<ClassAttendanceDetailScreenProps> = ({ classInfo, currentBranchId }) => {
    const { currentSchool } = useAuth();
    const [studentsInClass, setStudentsInClass] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        const loadAttendanceData = async () => {
            if (!currentSchool) return;
            setLoading(true);
            try {
                // 1. Fetch Students in Class
                const studentData = await fetchStudentsByClass(classInfo.grade, classInfo.section, currentSchool.id, currentBranchId || undefined);
                
                // 2. Fetch Attendance Records for this class and date
                const attendanceRecords = await api.getAttendance(classInfo.id, selectedDate);

                // 3. Merge attendance into student data
                const mergedStudents = studentData.map(student => {
                    const record = attendanceRecords?.find((r: any) => r.student_id === student.id);
                    
                    let status: AttendanceStatus = 'Absent'; // Default if no record
                    if (record?.status) {
                        status = (record.status.charAt(0).toUpperCase() + record.status.slice(1).toLowerCase()) as AttendanceStatus;
                    }
                    
                    return {
                        ...student,
                        attendanceStatus: status
                    };
                });

                setStudentsInClass(mergedStudents);
            } catch (err) {
                console.error("Error loading class attendance detail:", err);
            } finally {
                setLoading(false);
            }
        };

        loadAttendanceData();
    }, [classInfo.id, classInfo.grade, classInfo.section, currentSchool, currentBranchId, selectedDate]);

    const attendanceSummary = useMemo(() => {
        const total = studentsInClass.length;
        if (total === 0) return { total: 0, present: 0, absent: 0, late: 0, presentPercentage: 0 };

        const present = studentsInClass.filter(s => s.attendanceStatus === 'Present').length;
        const absent = studentsInClass.filter(s => s.attendanceStatus === 'Absent').length;
        const late = studentsInClass.filter(s => s.attendanceStatus === 'Late').length;
        const presentAndLate = present + late;
        const presentPercentage = total > 0 ? Math.round((presentAndLate / total) * 100) : 0;

        return { total, present, absent, late, presentPercentage };
    }, [studentsInClass]);

    return (
        <div className="flex flex-col h-full bg-gray-100">
            <div className="p-4 bg-white border-b border-gray-200">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                        <div className="relative">
                            <DonutChart percentage={attendanceSummary.presentPercentage} color="#4f46e5" size={70} strokeWidth={8} />
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-lg font-bold text-gray-800">{attendanceSummary.presentPercentage}%</span>
                            </div>
                        </div>
                        <div>
                            <p className="font-bold text-lg text-gray-800">Class Attendance</p>
                            <div className="flex items-center text-xs space-x-2">
                                <span className="text-green-600 font-medium">{attendanceSummary.present} Present</span>
                                <span className="text-blue-500 font-medium">{attendanceSummary.late} Late</span>
                                <span className="text-red-600 font-medium">{attendanceSummary.absent} Absent</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                        <CalendarIcon className="w-4 h-4 text-gray-400 mr-2" />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-transparent text-sm font-medium text-gray-700 focus:outline-none"
                        />
                    </div>
                </div>
            </div>

            <main className="flex-grow overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        <span className="ml-2 text-gray-500">Syncing attendance...</span>
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-200">
                        {studentsInClass.map(student => (
                            <li key={student.id} className="p-4 flex items-center justify-between bg-white hover:bg-gray-50">
                                <div className="flex items-center space-x-4">
                                    {student.avatarUrl ? (
                                        <img src={student.avatarUrl} alt={student.name} className="w-12 h-12 rounded-full object-cover" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                                            {student.name.charAt(0)}
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-bold text-gray-800">{student.name}</p>
                                        <p className="text-sm text-gray-500">ID: {student.schoolGeneratedId || 'Pending'}</p>
                                    </div>
                                </div>
                                <AttendanceStatusIndicator status={student.attendanceStatus} />
                            </li>
                        ))}
                        {studentsInClass.length === 0 && (
                            <div className="text-center py-10 bg-white">
                                <p className="text-gray-500">No students found in this class.</p>
                            </div>
                        )}
                    </ul>
                )}
            </main>
        </div>
    );
};

export default ClassAttendanceDetailScreen;
