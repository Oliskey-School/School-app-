import { supabase } from '../config/supabase';

export class DashboardService {
    static async getStats(schoolId: string, teacherId?: string) {
        // Parallel fetching for performance
        let studentQuery = supabase.from('students').select('*', { count: 'exact', head: true }).eq('school_id', schoolId);
        let classQuery = supabase.from('classes').select('*', { count: 'exact', head: true }).eq('school_id', schoolId);
        
        if (teacherId) {
            // Filter classes assigned to teacher
            classQuery = classQuery.eq('class_teachers.teacher_id', teacherId);
            // Filter students in those classes (using inner join logic via class_id if available or join table)
            // Simplified for now: count students belonging to classes assigned to teacher
            studentQuery = supabase.from('students')
                .select('*, class_teachers!inner(teacher_id)', { count: 'exact', head: true })
                .eq('school_id', schoolId)
                .eq('class_teachers.teacher_id', teacherId);
        }

        const [students, teachers, parents, classes, fees] = await Promise.all([
            studentQuery,
            supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
            supabase.from('parents').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
            classQuery,
            supabase.from('student_fees').select('total_fee, paid_amount').eq('school_id', schoolId).eq('status', 'Overdue')
        ]);

        const overdueFeesTotal = (fees.data || []).reduce((acc, fee) => acc + (fee.total_fee - fee.paid_amount), 0);

        return {
            totalStudents: students.count || 0,
            totalTeachers: teachers.count || 0,
            totalParents: parents.count || 0,
            totalClasses: classes.count || 0,
            overdueFees: overdueFeesTotal,
            // Mocking some trends/activity for the UI
            recentActivity: []
        };
    }
}
