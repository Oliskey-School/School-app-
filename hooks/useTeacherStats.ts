import { useState, useEffect } from 'react';
import { useTeacherClasses } from './useTeacherClasses';
import { ClassInfo } from '../types';
import { useAutoSync } from './useAutoSync';

interface TeacherStats {
    totalStudents: number;
    totalClasses: number;
    attendanceRate: number;
    avgStudentScore: number;
}

export const useTeacherStats = (
    teacherId: string | undefined,
    schoolId: string | undefined,
    branchId: string | undefined | null,
    teacherClasses?: ClassInfo[] | null
) => {
    const [stats, setStats] = useState<TeacherStats>({
        totalStudents: 0,
        totalClasses: 0,
        attendanceRate: 0,
        avgStudentScore: 0
    });
    const [loading, setLoading] = useState(true);
    const [version, setVersion] = useState(0);
    const forceUpdate = () => setVersion(v => v + 1);

    // Only call useTeacherClasses if teacherClasses is not provided
    const { classes: fetchedClasses, loading: classesLoading } = useTeacherClasses(teacherClasses ? null : teacherId, branchId);

    // Resolve which classes to use
    const classes = teacherClasses || fetchedClasses;

    useEffect(() => {
        const fetchStats = async () => {
            if (!teacherId || !schoolId) {
                setLoading(false);
                return;
            }

            try {
                const { api } = await import('../lib/api');
                const data = await api.getTeacherDashboardStats(teacherId, schoolId, branchId);

                if (data) {
                    const studentSum = classes ? classes.reduce((acc, c) => acc + (c.studentCount || 0), 0) : 0;
                    setStats({
                        totalStudents: data.totalStudents || studentSum,
                        totalClasses: teacherClasses ? teacherClasses.length : (data.totalClasses || (classes ? classes.length : 0)),
                        attendanceRate: data.attendanceRate || 0,
                        avgStudentScore: data.avgStudentScore || 0
                    });
                }
            } catch (err) {
                console.error('Unexpected error fetching teacher stats:', err);
            } finally {
                setLoading(false);
            }
        };

        if (!classesLoading) {
            fetchStats();
        }
    }, [teacherId, schoolId, classes, classesLoading, version]);

    useAutoSync(['students', 'class_teachers', 'teacher_attendance', 'exam_results'], () => {
        forceUpdate();
    });

    return { stats, loading };
};
