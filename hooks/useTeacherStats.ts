import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useTeacherClasses } from './useTeacherClasses';

interface TeacherStats {
    totalStudents: number;
    totalClasses: number;
    attendanceRate: number;
    avgStudentScore: number;
}

export const useTeacherStats = (teacherId: string | undefined, schoolId: string | undefined) => {
    const [stats, setStats] = useState<TeacherStats>({
        totalStudents: 0,
        totalClasses: 0,
        attendanceRate: 0,
        avgStudentScore: 0
    });
    const [loading, setLoading] = useState(true);
    const [version, setVersion] = useState(0);
    const forceUpdate = () => setVersion(v => v + 1);

    const { classes, loading: classesLoading } = useTeacherClasses(teacherId);

    useEffect(() => {
        const fetchStats = async () => {
            if (!teacherId || !schoolId) {
                setLoading(false);
                return;
            }

            try {
                // 1. Resolve Teacher ID (might be Auth User ID or Teacher Record ID)
                const { data: teacherRow } = await supabase
                    .from('teachers')
                    .select('id')
                    .or(`id.eq.${teacherId},user_id.eq.${teacherId}`)
                    .maybeSingle();

                const resolvedId = teacherRow ? teacherRow.id : teacherId;

                // 2. Call RPC with resolved ID (for Attendance & Scores)
                const { data, error } = await supabase.rpc('get_teacher_analytics', {
                    p_teacher_id: resolvedId,
                    p_school_id: schoolId
                });

                // 3. Calculate Real Student Count from Client-Side Resolved Classes
                // This handles both Modern (ID-based) and Legacy (String-based) classes correctly
                let calculatedTotalStudents = 0;

                if (classes && classes.length > 0) {
                    const classIds = classes.map(c => c.id);

                    // Build OR query for Grade/Section matching
                    // Format: grade.eq.10,section.eq.A,grade.eq.11,section.eq.B...
                    // We need to be careful with syntax. simpler might be to just fetch all students 
                    // in these grades and filter in JS if the query gets too complex.
                    // Let's fetch all students in the relevant grades, then filter.
                    const grades = [...new Set(classes.map(c => c.grade))];

                    if (grades.length > 0) {
                        const { data: studentsInGrades } = await supabase
                            .from('students')
                            .select('id, current_class_id, grade, section')
                            .in('grade', grades)
                            .eq('status', 'Active');

                        // Robust Client-Side Filtering
                        const validStudents = (studentsInGrades || []).filter(s => {
                            // 1. Exact Class ID Match
                            if (s.current_class_id && classIds.includes(s.current_class_id)) return true;

                            // 2. Grade & Section Match
                            return classes.some(c => {
                                // Must match Grade
                                if (c.grade !== s.grade) return false;

                                // Handle Section Matching
                                const classSection = (c.section || '').trim();
                                const studentSection = (s.section || '').trim();

                                // If class has NO section (Generic), it matches ALL sections for that grade
                                // If class HAS section, it must match student's section
                                return classSection === '' || classSection === studentSection;
                            });
                        });

                        calculatedTotalStudents = validStudents.length;
                    }
                }

                if (error) {
                    console.error('Error fetching teacher stats:', error);
                }

                // Merge RPC data with Client-Side Class/Student Counts
                const result = data && data.length > 0 ? data[0] : {};

                setStats({
                    totalStudents: calculatedTotalStudents, // Use robust client-side count
                    totalClasses: classes.length,          // Use robust client-side count
                    attendanceRate: Number(result.attendance_rate) || 0,
                    avgStudentScore: Number(result.avg_student_score) || 0
                });

            } catch (err) {
                console.error('Unexpected error fetching teacher stats:', err);
            } finally {
                setLoading(false);
            }
        };

        if (!classesLoading) {
            fetchStats();
        }

        // Subscribe to changes that affect teacher stats
        const channel = supabase.channel(`teacher-stats-${teacherId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
                forceUpdate();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'class_teachers' }, () => {
                forceUpdate();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'teacher_attendance' }, () => {
                forceUpdate();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'exam_results' }, () => {
                forceUpdate();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [teacherId, schoolId, classes, classesLoading, version]);

    return { stats, loading };
};
