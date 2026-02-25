import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { TimetableService } from '../services/timetable.service';
import { supabase } from '../config/supabase';

export const getTimetable = async (req: AuthRequest, res: Response) => {
    try {
        const { className } = req.query;
        let { teacherId } = req.query;

        if (req.user.role === 'teacher') {
            const { data: teacher } = await supabase
                .from('teachers')
                .select('id')
                .eq('user_id', req.user.id)
                .single();
            
            if (teacher) {
                teacherId = teacher.id;
            } else {
                return res.json([]);
            }
        }

        const result = await TimetableService.getTimetable(
            req.user.school_id,
            className as string,
            teacherId as string
        );
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

