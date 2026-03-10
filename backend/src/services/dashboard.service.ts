import { supabase } from '../config/supabase';

export class DashboardService {
    static async getStats(schoolId: string, teacherId?: string, branchId?: string) {
        console.log(`📊 [DashboardService] Fetching stats for schoolId: ${schoolId}, teacherId: ${teacherId}, branchId: ${branchId}`);
        // Parallel fetching for performance
        let studentQuery = supabase.from('students').select('*', { count: 'exact', head: true }).eq('school_id', schoolId);
        let teacherQuery = supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('school_id', schoolId);
        let parentQuery = supabase.from('parents').select('*', { count: 'exact', head: true }).eq('school_id', schoolId);
        let classQuery = supabase.from('classes').select('*', { count: 'exact', head: true }).eq('school_id', schoolId);
        let feeQuery = supabase.from('student_fees').select('amount, paid_amount').eq('school_id', schoolId).eq('status', 'Overdue');

        // Apply branch filter if provided
        if (branchId && branchId !== 'all') {
            const branchFilter = `branch_id.eq.${branchId},branch_id.is.null`;
            studentQuery = studentQuery.or(branchFilter);
            teacherQuery = teacherQuery.or(branchFilter);
            parentQuery = parentQuery.or(branchFilter);
            classQuery = classQuery.or(branchFilter);
            feeQuery = feeQuery.or(branchFilter);
        }

        if (teacherId) {
            // Get class IDs for the teacher first for accurate student counting
            const { data: teacherClassLinks } = await supabase
                .from('class_teachers')
                .select('class_id')
                .eq('teacher_id', teacherId);

            const classIds = teacherClassLinks?.map(l => l.class_id) || [];

            // Filter classes assigned to teacher
            classQuery = supabase.from('classes')
                .select('*', { count: 'exact', head: true })
                .in('id', classIds);

            // Filter students in those classes - count uniquely by student ID
            studentQuery = supabase.from('students')
                .select('*', { count: 'exact', head: true })
                .in('class_id', classIds);

            if (branchId && branchId !== 'all') {
                const branchFilter = `branch_id.eq.${branchId},branch_id.is.null`;
                classQuery = classQuery.or(branchFilter);
                studentQuery = studentQuery.or(branchFilter);
            }
        }

        // Calculate trends (Simple count of students added in last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const studentTrendQuery = supabase.from('students')
            .select('*', { count: 'exact', head: true })
            .eq('school_id', schoolId)
            .gt('created_at', thirtyDaysAgo.toISOString());

        const [students, teachers, parents, classes, fees, unpublishedReports, studentTrend, pendingApprovals, latestHealth, timetable] = await Promise.all([
            studentQuery,
            teacherQuery,
            parentQuery,
            classQuery,
            feeQuery,
            supabase.from('report_cards').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).eq('status', 'Draft'),
            studentTrendQuery,
            supabase.from('students').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('status', 'Pending'),
            supabase.from('health_logs').select('*, students(name)').eq('school_id', schoolId).order('logged_date', { ascending: false }).limit(1).maybeSingle(),
            supabase.from('timetable').select('*').eq('school_id', schoolId).eq('day', new Date().toLocaleDateString('en-US', { weekday: 'long' })).order('start_time', { ascending: true }).limit(5)
        ]);

        console.log(`🔍 [DashboardService] Query Results - Students: ${students.count}, Teachers: ${teachers.count}, Parents: ${parents.count}, Classes: ${classes.count}`);

        const feeData = fees.data || [];
        const overdueFeesTotal = feeData.reduce((acc: number, fee: any) => acc + (Number(fee.amount) - Number(fee.paid_amount)), 0);

        // Fetch Teacher Analytics if requested
        let teacherAnalytics = { totalStudents: students.count || 0, totalClasses: classes.count || 0, attendanceRate: 0, avgStudentScore: 0 };
        if (teacherId) {
            try {
                const { data, error } = await supabase.rpc('get_teacher_analytics', {
                    p_teacher_id: teacherId,
                    p_school_id: schoolId,
                    p_branch_id: branchId && branchId !== 'all' ? branchId : null
                });
                if (error) throw error;
                if (data && data.length > 0) {
                    teacherAnalytics = {
                        totalStudents: Number(data[0].total_students) || 0,
                        totalClasses: Number(data[0].total_classes) || 0,
                        attendanceRate: Number(data[0].attendance_rate) || 0,
                        avgStudentScore: Number(data[0].avg_student_score) || 0
                    };
                }
            } catch (err) {
                console.warn('Backend fallback: Failed to fetch teacher analytics via RPC:', err);
            }
        }

        return {
            totalStudents: teacherId ? teacherAnalytics.totalStudents : (students.count || 0),
            totalTeachers: teachers.count || 0,
            totalParents: parents.count || 0,
            totalClasses: teacherId ? teacherAnalytics.totalClasses : (classes.count || 0),
            overdueFees: overdueFeesTotal,
            unpublishedReports: unpublishedReports.count || 0,
            attendanceRate: teacherAnalytics.attendanceRate,
            avgStudentScore: teacherAnalytics.avgStudentScore,
            studentTrend: studentTrend.count || 0,
            teacherTrend: 0,
            parentTrend: 0,
            classTrend: 0,
            pendingApprovals: pendingApprovals.count || 0,
            latestHealthLog: latestHealth.data ? {
                studentName: (latestHealth.data.students as any)?.name || 'Unknown',
                description: latestHealth.data.description,
                logged_date: latestHealth.data.logged_date
            } : null,
            timetablePreview: timetable.data || [],
            recentActivity: []
        };
    }

    static async getAuditLogs(schoolId: string, limit: number = 50, branchId?: string) {
        let query = supabase
            .from('audit_logs')
            .select('*, profiles:users!audit_logs_user_id_fkey(name, avatar_url)')
            .eq('school_id', schoolId);

        if (branchId && branchId !== 'all') {
            query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
        }

        const { data, error } = await query.order('created_at', { ascending: false }).limit(limit);
        if (error) throw new Error(error.message);

        // DEMO MOCK
        if (schoolId === 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1' && (!data || data.length === 0)) {
            return [
                { id: 'a1', action: 'Login', user_name: 'Demo Admin', created_at: new Date().toISOString() },
                { id: 'a2', action: 'Update', table_name: 'students', details: 'Updated STU001 profile', created_at: new Date(Date.now() - 7200000).toISOString() }
            ];
        }

        return data || [];
    }
}
