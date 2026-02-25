import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { DashboardService } from '../services/dashboard.service';
import { supabase } from '../config/supabase';

export const getStats = async (req: AuthRequest, res: Response) => {
    try {
        let teacherId = undefined;
        if (req.user.role === 'teacher') {
            const { data: teacher } = await supabase
                .from('teachers')
                .select('id')
                .eq('user_id', req.user.id)
                .single();
            if (teacher) teacherId = teacher.id;
            else return res.json({ totalStudents: 0, totalTeachers: 0, totalParents: 0, totalClasses: 0, overdueFees: 0, recentActivity: [] });
        }

        const stats = await DashboardService.getStats(req.user.school_id, teacherId);
        res.json(stats);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
