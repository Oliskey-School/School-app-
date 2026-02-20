import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { LessonPlanService } from '../services/lessonPlan.service';

export const getLessonPlans = async (req: AuthRequest, res: Response) => {
    try {
        const result = await LessonPlanService.getLessonPlans(req.user.school_id, req.query.teacherId as string);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createLessonPlan = async (req: AuthRequest, res: Response) => {
    try {
        const result = await LessonPlanService.createLessonPlan(req.user.school_id, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateLessonPlan = async (req: AuthRequest, res: Response) => {
    try {
        const result = await LessonPlanService.updateLessonPlan(req.user.school_id, req.params.id as string, req.body);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteLessonPlan = async (req: AuthRequest, res: Response) => {
    try {
        await LessonPlanService.deleteLessonPlan(req.user.school_id, req.params.id as string);
        res.status(204).send();
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
