import { supabase } from '../config/supabase';

export class DashboardService {
    static async getStats(schoolId: string) {
        // Parallel fetching for performance
        const [students, teachers, parents, classes, fees] = await Promise.all([
            supabase.from('students').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
            supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
            supabase.from('parents').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
            supabase.from('classes').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
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
