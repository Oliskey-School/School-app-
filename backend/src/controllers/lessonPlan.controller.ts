import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { LessonPlanService } from '../services/lessonPlan.service';
import prisma from '../config/database';
import { getEffectiveBranchId } from '../utils/branchScope';

export const getLessonPlans = async (req: AuthRequest, res: Response) => {
    try {
        let teacherId = req.query.teacherId as string;

        if (req.user.role === 'TEACHER') {
            const teacher = await prisma.teacher.findUnique({
                where: { user_id: req.user.id },
                select: { id: true }
            });
            if (teacher) teacherId = teacher.id;
            else return res.json([]);
        }

        const branchId = getEffectiveBranchId(req.user, (req.query.branchId || req.query.branch_id) as string);
        const result = await LessonPlanService.getLessonPlans(req.user.school_id, branchId, teacherId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createLessonPlan = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id || req.body.branchId);
        const result = await LessonPlanService.createLessonPlan(req.user.school_id, branchId, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateLessonPlan = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id || req.body.branchId);
        const result = await LessonPlanService.updateLessonPlan(req.user.school_id, branchId, req.params.id as string, req.body);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteLessonPlan = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id || req.body.branchId || (req.query.branchId as string));
        await LessonPlanService.deleteLessonPlan(req.user.school_id, branchId, req.params.id as string);
        res.status(204).send();
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
