import React, { useMemo, useState, useEffect } from 'react';
import { Student, ClassInfo, AttendanceStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import DonutChart from '../ui/DonutChart';
import { CheckCircleIcon, XCircleIcon, ClockIcon, ExclamationCircleIcon, CalendarIcon } from '../../constants';
import { useAutoSync } from '../../hooks/useAutoSync';

interface ClassAttendanceDetailScreenProps {
    classInfo: any; // Flexible for the summary data passed
    date?: string; // Initial date from overview
    currentBranchId?: string | null;
}

const AttendanceStatusIndicator: React.FC<{ status: AttendanceStatus }> = ({ status }) => {
    const styles = {
        Present: { icon: <CheckCircleIcon className="w-5 h-5 text-green-500" />, text: 'text-green-700' },
        Absent: { icon: <XCircleIcon className="w-5 h-5 text-red-500" />, text: 'text-red-700' },
        Late: { icon: <ClockIcon className="w-5 h-5 text-blue-500" />, text: 'text-blue-700' },
        Leave: { icon: <ExclamationCircleIcon className="w-5 h-5 text-orange-500" />, text: 'text-orange-700' },
    };
    
    // Normalize status to match keys safely
    const rawStatus = (status || 'Absent').toString();
    const normalizedStatus = (rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase()) as AttendanceStatus;
    const style = styles[normalizedStatus] || styles['Absent'];
    
    return (
        <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-sm font-semibold bg-gray-100 ${style.text}`}>
            {style.icon}
            <span>{normalizedStatus}</span>
        </div>
    );
};

const ClassAttendanceDetailScreen: React.FC<ClassAttendanceDetailScreenProps> = ({ classInfo, date, currentBranchId }) => {
    const { currentSchool } = useAuth();
    const [studentsInClass, setStudentsInClass] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(date || new Date().toISOString().split('T')[0]);

    const loadAttendanceData = async () => {
        if (!currentSchool?.id || !classInfo) return;
        setLoading(true);
        try {
            // 1. Fetch Students in Class directly from API
            const studentData = await api.getStudentsByClass(
                classInfo.grade, 
                classInfo.section, 
                currentSchool.id, 
                currentBranchId || undefined
            );
            
            // 2. Fetch Attendance Records for this class and date
            let attendanceRecords = [];
            if (classInfo.id) {
                attendanceRecords = await api.getAttendanceByClass(classInfo.id, selectedDate);
            } else {
                const schoolAttendance = await api.getAttendanceByDate(currentSchool.id, selectedDate);
                const studentIds = new Set(studentData.map((s: any) => s.id));
                attendanceRecords = (schoolAttendance || []).filter((r: any) => studentIds.has(r.student_id));
            }

            // 3. Merge attendance into student data
            const mergedStudents = studentData.map((student: any) => {
                const record = attendanceRecords?.find((r: any) => r.student_id === student.id);
                
                let status: AttendanceStatus = 'Absent';
                if (record?.status) {
                    const s = record.status.toLowerCase();
                    if (s === 'present') status = 'Present';
                    else if (s === 'late') status = 'Late';
                    else if (s === 'leave') status = 'Leave';
                    else status = 'Absent';
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

    useEffect(() => {
        loadAttendanceData();
    }, [classInfo, currentSchool, currentBranchId, selectedDate]);

    useAutoSync(['attendance', 'students'], () => {
        console.log('🔄 [ClassAttendanceDetail] Real-time auto-sync triggered');
        loadAttendanceData();
    });

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
                            <p className="font-bold text-lg text-gray-800">
                                {classInfo ? `Grade ${classInfo.grade}${classInfo.section}` : 'Class'} Attendance
                            </p>
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
                        <span className="ml-2 text-gray-500">Syncing database...</span>
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-200 shadow-sm rounded-xl mx-4 my-2 overflow-hidden border border-gray-100">
                        {studentsInClass.map(student => (
                            <li key={student.id} className="p-4 flex items-center justify-between bg-white hover:bg-indigo-50/30 transition-colors">
                                <div className="flex items-center space-x-4">
                                    {(student.avatar_url || student.avatarUrl) ? (
                                        <img src={student.avatar_url || student.avatarUrl} alt={student.full_name || student.name} className="w-12 h-12 rounded-full object-cover shadow-sm" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200">
                                            {(student.full_name || student.name || '?').charAt(0)}
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-bold text-gray-800">{student.full_name || student.name}</p>
                                        <p className="text-xs text-gray-400 font-medium">ID: {student.school_generated_id || student.schoolGeneratedId || 'N/A'}</p>
                                    </div>
                                </div>
                                <AttendanceStatusIndicator status={student.attendanceStatus} />
                            </li>
                        ))}
                        {studentsInClass.length === 0 && (
                            <div className="text-center py-20 bg-white">
                                <p className="text-gray-400 font-medium italic">No students found for this class.</p>
                            </div>
                        )}
                    </ul>
                )}
            </main>
        </div>
    );
};

export default ClassAttendanceDetailScreen;
