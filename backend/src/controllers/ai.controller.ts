import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AiService } from '../services/ai.service';
import { supabase } from '../config/supabase';

export const getGeneratedResources = async (req: AuthRequest, res: Response) => {
    try {
        let teacherId = req.query.teacherId as string;

        if (req.user.role === 'teacher') {
            const { data: teacher } = await supabase
                .from('teachers')
                .select('id')
                .eq('user_id', req.user.id)
                .single();
            if (teacher) teacherId = teacher.id;
            else return res.json([]);
        }

        if (!teacherId) {
            return res.status(400).json({ message: "Teacher ID is required" });
        }

        const result = await AiService.getGeneratedResources(teacherId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const saveGeneratedResource = async (req: AuthRequest, res: Response) => {
    try {
        const result = await AiService.saveGeneratedResource(req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
