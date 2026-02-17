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
                    const { count } = await supabase
                        .from('students')
                        .select('id', { count: 'exact', head: true })
                        .in('current_class_id', classIds)
                        .eq('status', 'Active');

                    calculatedTotalStudents = count || 0;
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
