import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { DashboardService } from '../services/dashboard.service';
import { supabase } from '../config/supabase';

export const getStats = async (req: AuthRequest, res: Response) => {
    try {
        console.log(`[DashboardController] getStats requested. User Role: ${req.user.role}`);
        const schoolId = req.user.school_id || (req.query.schoolId as string) || (req.query.school_id as string);
        let teacherId = (req.query.teacherId || req.query.teacher_id) as string | undefined;

        if (req.user.role === 'teacher' && !teacherId) {
            console.log('[DashboardController] User is a teacher. Fetching teacher record...');
            const { data: teachers } = await supabase
                .from('teachers')
                .select('id, email')
                .eq('user_id', req.user.id);

            if (teachers && teachers.length > 0) {
                const specificTeacher = teachers.find(t => t.email !== 'demo_teacher@school.com');
                teacherId = specificTeacher ? specificTeacher.id : teachers[0].id;
            } else {
                return res.json({ totalStudents: 0, totalTeachers: 0, totalParents: 0, totalClasses: 0, overdueFees: 0, recentActivity: [] });
            }
        }

        const branchId = req.user.branch_id || (req.query.branchId as string) || (req.query.branch_id as string);
        console.log(`[DashboardController] Calling DashboardService.getStats with schoolId: ${schoolId}, teacherId: ${teacherId}, branchId: ${branchId}`);
        const stats = await DashboardService.getStats(schoolId, teacherId, branchId);
        res.json(stats);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getAuditLogs = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id || (req.query.schoolId as string) || (req.query.school_id as string);
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
        const branchId = (req.query.branchId as string) || (req.query.branch_id as string);
        const logs = await DashboardService.getAuditLogs(schoolId, limit, branchId);
        res.json(logs);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
