
import React, { useState, useMemo } from 'react';
import { Student, ClassInfo, Teacher } from '../../types';
import { mockStudents, mockClasses, mockTeachers, mockStudentAttendance } from '../../data';
import { ChevronLeftIcon, AIIcon } from '../../constants';

const LOGGED_IN_TEACHER_ID = 2; // Mrs. Funke Akintola

interface TeacherReportsScreenProps {
  navigateTo: (view: string, title: string, props: any) => void;
}

const TeacherReportsScreen: React.FC<TeacherReportsScreenProps> = ({ navigateTo }) => {
    const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null);

    // Show all classes for reports, sorted by grade and section
    const allClasses = useMemo(() => {
        return [...mockClasses].sort((a, b) => {
            if (a.grade !== b.grade) return a.grade - b.grade;
            return a.section.localeCompare(b.section);
        });
    }, []);

    const studentsInClass = useMemo(() => {
        if (!selectedClass) return [];
        return mockStudents.filter(s => s.grade === selectedClass.grade && s.section === selectedClass.section);
    }, [selectedClass]);

    const getStudentStats = (studentId: number) => {
        const student = mockStudents.find(s => s.id === studentId);
        const academicPerformance = student?.academicPerformance || [];
        const averageScore = academicPerformance.length > 0
            ? Math.round(academicPerformance.reduce((sum, record) => sum + record.score, 0) / academicPerformance.length)
            : 0;
            
        const attendanceRecords = mockStudentAttendance.filter(a => a.studentId === studentId && a.status !== 'Leave');
        const presentCount = attendanceRecords.filter(a => a.status === 'Present' || a.status === 'Late').length;
        const attendancePercentage = attendanceRecords.length > 0 ? Math.round((presentCount / attendanceRecords.length) * 100) : 100;

        return { averageScore, attendancePercentage };
    };

    if (!selectedClass) {
        return (
            <div className="p-4 space-y-4">
                <h3 className="text-xl font-bold text-gray-800">Select a Class to View Reports</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {allClasses.map(cls => (
                        <button key={cls.id} onClick={() => setSelectedClass(cls)} className="p-6 bg-white rounded-xl shadow-sm text-center hover:bg-purple-50 transition-colors">
                            <p className="font-bold text-2xl text-purple-700">Grade {cls.grade}{cls.section}</p>
                            <p className="text-sm text-gray-500">{cls.studentCount} Students</p>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gray-100">
            <header className="p-4 bg-white border-b border-gray-200">
                <button onClick={() => setSelectedClass(null)} className="flex items-center space-x-1 text-sm font-semibold text-purple-600 hover:text-purple-800">
                    <ChevronLeftIcon className="w-5 h-5" />
                    <span>All Classes</span>
                </button>
                <div className="mt-2">
                    <h2 className="text-xl font-bold text-gray-800">Reports: Grade {selectedClass.grade}{selectedClass.section}</h2>
                </div>
                 <button 
                    onClick={() => navigateTo('aiPerformanceSummary', 'AI Class Summary', { students: studentsInClass })}
                    className="mt-3 w-full flex items-center justify-center space-x-2 py-2 px-4 bg-purple-600 text-white font-semibold rounded-xl shadow-md hover:bg-purple-700 transition-colors">
                    <AIIcon className="w-5 h-5" />
                    <span>Generate AI Class Summary</span>
                </button>
            </header>
            <main className="flex-grow p-4 space-y-3 overflow-y-auto">
                {studentsInClass.map(student => {
                    const { averageScore, attendancePercentage } = getStudentStats(student.id);
                    return (
                        <div key={student.id} className="bg-white rounded-xl shadow-sm p-3 flex items-center space-x-3">
                            <img src={student.avatarUrl} alt={student.name} className="w-12 h-12 rounded-full object-cover" />
                            <div className="flex-grow">
                                <p className="font-bold text-gray-800">{student.name}</p>
                                <div className="flex items-center space-x-3 text-sm text-gray-500">
                                    <span>Avg Score: <span className="font-semibold text-purple-700">{averageScore}%</span></span>
                                    <span>Attendance: <span className="font-semibold text-purple-700">{attendancePercentage}%</span></span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </main>
        </div>
    );
};

export default TeacherReportsScreen;
