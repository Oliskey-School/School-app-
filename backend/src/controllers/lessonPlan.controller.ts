import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { LessonPlanService } from '../services/lessonPlan.service';
import prisma from '../config/database';
import { getEffectiveBranchId } from '../utils/branchScope';
import { sendError } from '../utils/httpError';

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
        const classId = req.query.classId as string | undefined;
        const subjectId = req.query.subjectId as string | undefined;
        const status = req.query.status as string | undefined;
        const result = await LessonPlanService.getLessonPlans(req.user.school_id, branchId, teacherId, classId, subjectId, status);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'lessonPlan.controller.ts');
    }
};

const ADMIN_ROLES = ['ADMIN', 'PROPRIETOR', 'SUPERADMIN', 'SUPER_ADMIN'];

/**
 * Resolves the caller's own teacher.id when they are a TEACHER, or null for
 * admin-tier roles (who are not ownership-restricted). Throws a tagged error
 * for a TEACHER role with no teacher profile so callers can 403 cleanly.
 */
async function resolveOwnTeacherId(req: AuthRequest): Promise<string | null> {
    const role = (req.user.role || '').toUpperCase();
    if (ADMIN_ROLES.includes(role)) return null;
    const teacher = await prisma.teacher.findUnique({
        where: { user_id: req.user.id },
        select: { id: true }
    });
    if (!teacher) {
        const err: any = new Error('Teacher profile not found');
        err.status = 403;
        throw err;
    }
    return teacher.id;
}

export const createLessonPlan = async (req: AuthRequest, res: Response) => {
    try {
        const ownTeacherId = await resolveOwnTeacherId(req);
        // A teacher may only author lesson plans as themselves — never spoof
        // another teacher's id. Admin-tier roles may set any teacher_id.
        const body = ownTeacherId ? { ...req.body, teacherId: ownTeacherId } : req.body;

        const branchId = getEffectiveBranchId(req.user, body.branch_id || body.branchId);
        const result = await LessonPlanService.createLessonPlan(req.user.school_id, branchId, body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(error.status || 500).json({ message: error.message });
    }
};

export const updateLessonPlan = async (req: AuthRequest, res: Response) => {
    try {
        const ownTeacherId = await resolveOwnTeacherId(req);
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id || req.body.branchId);
        const result = await LessonPlanService.updateLessonPlan(req.user.school_id, branchId, req.params.id as string, req.body, ownTeacherId);
        res.json(result);
    } catch (error: any) {
        res.status(error.status || 500).json({ message: error.message });
    }
};

export const deleteLessonPlan = async (req: AuthRequest, res: Response) => {
    try {
        const ownTeacherId = await resolveOwnTeacherId(req);
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id || req.body.branchId || (req.query.branchId as string));
        await LessonPlanService.deleteLessonPlan(req.user.school_id, branchId, req.params.id as string, ownTeacherId);
        res.status(204).send();
    } catch (error: any) {
        res.status(error.status || 500).json({ message: error.message });
    }
};
