
import React, { useState, useMemo, useEffect } from 'react';
import { Student, ClassInfo } from '../../types';
import { ChevronLeftIcon, AIIcon, getFormattedClassName } from '../../constants';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../context/ProfileContext';
import { useAuth } from '../../context/AuthContext';
import { useTeacherClasses } from '../../hooks/useTeacherClasses';

interface TeacherReportsScreenProps {
    navigateTo: (view: string, title: string, props: any) => void;
    teacherId?: number | null;
}

const TeacherReportsScreen: React.FC<TeacherReportsScreenProps> = ({ navigateTo, teacherId }) => {
    const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null);
    const [students, setStudents] = useState<Student[]>([]);

    // New Hook for classes
    const { classes, loading: loadingClasses } = useTeacherClasses(teacherId);
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
                // 1. Fetch Students
                const { data: studentsData } = await supabase
                    .from('students')
                    .select('*')
                    .eq('grade', selectedClass.grade)
                    .eq('section', selectedClass.section);

                if (!studentsData) {
                    setStudents([]);
                    return;
                }

                const studentsWithStats = await Promise.all(studentsData.map(async (s: any) => {
                    // 2. Fetch Performance
                    const { data: performance } = await supabase
                        .from('academic_performance')
                        .select('subject, score')
                        .eq('student_id', s.id);

                    const avgScore = performance && performance.length > 0
                        ? Math.round(performance.reduce((acc, curr) => acc + curr.score, 0) / performance.length)
                        : 0;

                    // 3. Fetch Attendance
                    const { count: totalAttendance } = await supabase
                        .from('student_attendance')
                        .select('*', { count: 'exact', head: true })
                        .eq('student_id', s.id);

                    const { count: presentAttendance } = await supabase
                        .from('student_attendance')
                        .select('*', { count: 'exact', head: true })
                        .eq('student_id', s.id)
                        .in('status', ['Present', 'Late']);

                    const attendancePct = totalAttendance && totalAttendance > 0
                        ? Math.round(((presentAttendance || 0) / totalAttendance) * 100)
                        : 100;

                    return {
                        ...s,
                        name: s.name,
                        avatarUrl: s.avatar_url,
                        gradeAverage: avgScore,
                        attendancePercentage: attendancePct,
                        academicPerformance: performance
                    };
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
                            <p className="font-bold text-2xl text-purple-700">Grade {cls.grade}{cls.section}</p>
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
                    <h2 className="text-xl font-bold text-gray-800">Reports: Grade {selectedClass.grade}{selectedClass.section}</h2>
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
