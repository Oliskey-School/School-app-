import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ReportCardService } from '../services/reportCard.service';
import { supabase } from '../config/supabase';

export const getReportCards = async (req: AuthRequest, res: Response) => {
    try {
        let teacherId = undefined;
        if (req.user.role === 'teacher') {
            const { data: teacher } = await supabase
                .from('teachers')
                .select('id')
                .eq('user_id', req.user.id)
                .single();
            if (teacher) teacherId = teacher.id;
            else return res.json([]);
        }

        const result = await ReportCardService.getReportCards(req.user.school_id, teacherId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateStatus = async (req: AuthRequest, res: Response) => {
    try {
        const result = await ReportCardService.updateStatus(req.user.school_id, req.params.id as string, req.body.status);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
