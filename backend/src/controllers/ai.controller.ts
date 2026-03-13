import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AiService } from '../services/ai.service';
import { supabase } from '../config/supabase';
import { getEffectiveBranchId } from '../utils/branchScope';

export const getGeneratedResources = async (req: AuthRequest, res: Response) => {
    try {
        let teacherId = (req.query.teacherId || req.query.teacher_id) as string;

        if (req.user.role === 'teacher' && !teacherId) {
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

        const requestedBranch = (req.query.branch_id as string) || (req.query.branchId as string) || (req.body?.branch_id as string);
        const branchId = getEffectiveBranchId(req.user, requestedBranch);
        const result = await AiService.getGeneratedResources(req.user.school_id, branchId, teacherId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const saveGeneratedResource = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.body?.branch_id);
        const result = await AiService.saveGeneratedResource(req.user.school_id, branchId, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
