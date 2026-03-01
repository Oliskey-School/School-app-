import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { DashboardService } from '../services/dashboard.service';
import { supabase } from '../config/supabase';

export const getStats = async (req: AuthRequest, res: Response) => {
    try {
        let teacherId = undefined;
        if (req.user.role === 'teacher') {
            // Find the teacher record, prioritizing those with an email that isn't 'demo_teacher@school.com'
            // or simply the most recently updated/created one if multiples exist for a demo user_id.
            const { data: teachers } = await supabase
                .from('teachers')
                .select('id, email')
                .eq('user_id', req.user.id);

            if (teachers && teachers.length > 0) {
                // If multiple, try to find one that isn't the generic demo email
                const specificTeacher = teachers.find(t => t.email !== 'demo_teacher@school.com');
                teacherId = specificTeacher ? specificTeacher.id : teachers[0].id;
            } else {
                return res.json({ totalStudents: 0, totalTeachers: 0, totalParents: 0, totalClasses: 0, overdueFees: 0, recentActivity: [] });
            }
        }

        const branchId = req.query.branchId as string;
        const stats = await DashboardService.getStats(req.user.school_id, teacherId, branchId);
        res.json(stats);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
