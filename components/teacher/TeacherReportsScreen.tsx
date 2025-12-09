
import React, { useState, useMemo, useEffect } from 'react';
import { Student, ClassInfo } from '../../types';
import { ChevronLeftIcon, AIIcon } from '../../constants';
import { supabase } from '../../lib/supabase';

// Helper to parse 'Grade 10A'
const parseClassName = (name: string) => {
    const match = name.match(/(\d+)([A-Za-z]+)/);
    if (match) return { grade: parseInt(match[1]), section: match[2] };
    return { grade: 0, section: '' };
};

interface TeacherReportsScreenProps {
    navigateTo: (view: string, title: string, props: any) => void;
}

const TeacherReportsScreen: React.FC<TeacherReportsScreenProps> = ({ navigateTo }) => {
    const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null);
    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch Classes
    useEffect(() => {
        const fetchClasses = async () => {
            try {
                // Fetch all classes (or filter by teacher if we had auth context here easily accessible, 
                // but 'Report Cards' usually implies access to any class for flexibility or restricted by teacher)
                // Let's fetch classes from 'classes' table
                const { data: classesData } = await supabase.from('classes').select('*');

                if (classesData) {
                    const formattedClasses = classesData.map((c: any) => ({
                        id: c.id,
                        grade: c.grade,
                        section: c.section,
                        subject: c.subject, // Include subject
                        studentCount: c.student_count || 0,
                        // ... other mappings
                    }));
                    setClasses(formattedClasses.sort((a: any, b: any) => {
                        if (a.grade !== b.grade) return a.grade - b.grade;
                        return a.section.localeCompare(b.section);
                    }));
                }
            } catch (error) {
                console.error('Error fetching classes', error);
            } finally {
                setLoading(false);
            }
        };
        fetchClasses();
    }, []);

    // Fetch Students & Stats when class selected
    useEffect(() => {
        if (!selectedClass) return;

        const fetchStudentsAndStats = async () => {
            setLoading(true);
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
                        : 100; // Default to 100 if no record? Or 0? 100 is friendlier if no data yet.

                    return {
                        ...s,
                        name: s.name,
                        avatarUrl: s.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=random`,
                        // Attach stats to student object for display (using partial type or extending type locally)
                        gradeAverage: avgScore,
                        attendancePercentage: attendancePct,
                        academicPerformance: performance // Needed for AI summary
                    };
                }));

                setStudents(studentsWithStats as any); // Type assertion for now due to custom props
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
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
                            <img src={student.avatarUrl} alt={student.name} className="w-12 h-12 rounded-full object-cover" />
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
