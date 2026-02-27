
import React, { useMemo, useState, useEffect } from 'react';
import { Student, ClassInfo, AttendanceStatus } from '../../types';
import { fetchStudentsByClass } from '../../lib/database';
import { useAuth } from '../../context/AuthContext';
import DonutChart from '../ui/DonutChart';
import { CheckCircleIcon, XCircleIcon, ClockIcon, ExclamationCircleIcon } from '../../constants';

interface ClassAttendanceDetailScreenProps {
    classInfo: ClassInfo & { present: number; total: number; };
    currentBranchId?: string | null;
}

const AttendanceStatusIndicator: React.FC<{ status: AttendanceStatus }> = ({ status }) => {
    const styles = {
        Present: { icon: <CheckCircleIcon className="w-5 h-5 text-green-500" />, text: 'text-green-700' },
        Absent: { icon: <XCircleIcon className="w-5 h-5 text-red-500" />, text: 'text-red-700' },
        Late: { icon: <ClockIcon className="w-5 h-5 text-blue-500" />, text: 'text-blue-700' },
        Leave: { icon: <ExclamationCircleIcon className="w-5 h-5 text-orange-500" />, text: 'text-orange-700' },
    };
    const { icon, text } = styles[status] || styles['Leave'];
    return (
        <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-sm font-semibold bg-gray-100 ${text}`}>
            {icon}
            <span>{status}</span>
        </div>
    );
};

const ClassAttendanceDetailScreen: React.FC<ClassAttendanceDetailScreenProps> = ({ classInfo, currentBranchId }) => {
    const { currentSchool } = useAuth();
    const [studentsInClass, setStudentsInClass] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadStudents = async () => {
            if (!currentSchool) return;
            setLoading(true);
            try {
                const data = await fetchStudentsByClass(classInfo.grade, classInfo.section, currentSchool.id, currentBranchId || undefined);
                setStudentsInClass(data);
            } catch (err) {
                console.error("Error loading class students:", err);
            } finally {
                setLoading(false);
            }
        };
        if (currentSchool) {
            loadStudents();
        }
    }, [classInfo.grade, classInfo.section, currentSchool, currentBranchId]);

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

    if (loading) return <div className="p-8 text-center text-gray-500">Loading attendance...</div>;

    return (
        <div className="flex flex-col h-full bg-gray-100">
            <div className="p-4 bg-white border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-bold text-lg text-gray-800">Class Attendance</p>
                        <p className="text-sm text-gray-500">
                            <span className="text-green-600 font-medium">{attendanceSummary.present} Present</span> &bull;
                            <span className="text-blue-500 font-medium"> {attendanceSummary.late} Late</span> &bull;
                            <span className="text-red-600 font-medium"> {attendanceSummary.absent} Absent</span>
                        </p>
                    </div>
                    <div className="relative">
                        <DonutChart percentage={attendanceSummary.presentPercentage} color="#4f46e5" size={70} strokeWidth={8} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-lg font-bold text-gray-800">{attendanceSummary.presentPercentage}%</span>
                        </div>
                    </div>
                </div>
            </div>

            <main className="flex-grow overflow-y-auto">
                <ul className="divide-y divide-gray-200">
                    {studentsInClass.map(student => (
                        <li key={student.id} className="p-4 flex items-center justify-between bg-white hover:bg-gray-50">
                            <div className="flex items-center space-x-4">
                                <img src={student.avatarUrl} alt={student.name} className="w-12 h-12 rounded-full object-cover" />
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
            </main>
        </div>
    );
};

export default ClassAttendanceDetailScreen;
