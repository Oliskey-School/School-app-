
import React, { useState, useMemo, useEffect } from 'react';
import { Student, ClassInfo } from '../../types';
import { ChevronLeftIcon, AIIcon, getFormattedClassName } from '../../constants';
import { api } from '../../lib/api';
import { useProfile } from '../../context/ProfileContext';
import { useAuth } from '../../context/AuthContext';
import { useTeacherClasses } from '../../hooks/useTeacherClasses';

interface TeacherReportsScreenProps {
    navigateTo: (view: string, title: string, props: any) => void;
    teacherId?: string | null;
}

const TeacherReportsScreen: React.FC<TeacherReportsScreenProps> = ({ navigateTo, teacherId }) => {
    const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null);
    const [students, setStudents] = useState<Student[]>([]);

    // New Hook for classes
    const { classes: rawClasses, loading: loadingClasses } = useTeacherClasses(teacherId);
    
    // Deduplicate classes by formatted name
    const classes = useMemo(() => {
        const groups = new Map<string, ClassInfo>();
        rawClasses.forEach(cls => {
            const name = getFormattedClassName(cls.grade, cls.section);
            const existing = groups.get(name);
            if (existing) {
                existing.studentCount += (cls.studentCount || 0);
            } else {
                groups.set(name, { ...cls });
            }
        });
        return Array.from(groups.values());
    }, [rawClasses]);

    const [loadingStudents, setLoadingStudents] = useState(false);

    // Combine loading states
    const loading = loadingClasses || loadingStudents;

    const { profile } = useProfile();

    // Fetch Students & Stats when class selected
    useEffect(() => {
        if (!selectedClass) return;

        const fetchStudentsAndStats = async () => {
            setLoadingStudents(true);
            try {
                // Fetch students by grade via backend API
                const studentsData = await api.getStudentsByClass(
                    selectedClass.schoolId || '',
                    String(selectedClass.grade),
                    selectedClass.section || ''
                );

                if (!studentsData || studentsData.length === 0) {
                    setStudents([]);
                    return;
                }

                // Fetch report stats for each student via backend
                const studentsWithStats = await Promise.all(studentsData.map(async (s: any) => {
                    try {
                        const stats = await api.getStudentReportStats(s.id);
                        return {
                            ...s,
                            name: s.name,
                            avatarUrl: s.avatar_url,
                            gradeAverage: stats?.avgScore || 0,
                            attendancePercentage: stats?.attendancePct || 100,
                            academicPerformance: stats?.performance || []
                        };
                    } catch {
                        return { ...s, gradeAverage: 0, attendancePercentage: 100 };
                    }
                }));

                setStudents(studentsWithStats as any);
            } catch (err) {
                console.error(err);
            } finally {
                setLoadingStudents(false);
            }
        };
        fetchStudentsAndStats();

    }, [selectedClass]);

    if (loading && !selectedClass && classes.length === 0) return <div className="p-10 text-center">Loading classes...</div>;

    if (!selectedClass) {
        return (
            <div className="p-4 space-y-4">
                <h3 className="text-xl font-bold text-gray-800">Select a Class to View Reports</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {classes.map(cls => (
                        <button key={cls.id} onClick={() => setSelectedClass(cls)} className="p-6 bg-white rounded-xl shadow-sm text-center hover:bg-purple-50 transition-colors flex flex-col items-center justify-center space-y-2">
                            <p className="font-bold text-2xl text-purple-700">{getFormattedClassName(cls.grade, cls.section)}</p>
                            <p className="text-sm font-medium text-gray-700">{cls.subject}</p>
                            <p className="text-xs text-gray-500">{cls.studentCount} Students</p>
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
                    <h2 className="text-xl font-bold text-gray-800">Reports: {getFormattedClassName(selectedClass.grade, selectedClass.section)}</h2>
                </div>
                <button
                    onClick={() => navigateTo('aiPerformanceSummary', 'AI Class Summary', { students: students })}
                    className="mt-3 w-full flex items-center justify-center space-x-2 py-2 px-4 bg-purple-600 text-white font-semibold rounded-xl shadow-md hover:bg-purple-700 transition-colors">
                    <AIIcon className="w-5 h-5" />
                    <span>Generate AI Class Summary</span>
                </button>
            </header>
            <main className="flex-grow p-4 space-y-3 overflow-y-auto">
                {loading ? <div className="text-center py-4">Loading student data...</div> : (
                    students.length > 0 ? students.map((student: any) => (
                        <div key={student.id} className="bg-white rounded-xl shadow-sm p-3 flex items-center space-x-3">
                            {student.avatarUrl ? (
                                <img src={student.avatarUrl} alt={student.name} className="w-12 h-12 rounded-full object-cover" />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-500 font-bold">
                                    {student.name.charAt(0)}
                                </div>
                            )}
                            <div className="flex-grow">
                                <p className="font-bold text-gray-800">{student.name}</p>
                                <div className="flex items-center space-x-3 text-sm text-gray-500">
                                    <span>Avg Score: <span className="font-semibold text-purple-700">{student.gradeAverage}%</span></span>
                                    <span>Attendance: <span className="font-semibold text-purple-700">{student.attendancePercentage}%</span></span>
                                </div>
                            </div>
                        </div>
                    )) : <div className="text-center py-10 text-gray-500">No students in this class.</div>
                )}
            </main>
        </div>
    );
};

export default TeacherReportsScreen;

