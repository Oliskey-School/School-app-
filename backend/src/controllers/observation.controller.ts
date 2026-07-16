import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ObservationService } from '../services/observation.service';
import prisma from '../config/database';
import { getEffectiveBranchId } from '../utils/branchScope';

const ADMIN_ROLES = ['admin', 'proprietor', 'superadmin', 'super_admin'];

function isAdmin(req: AuthRequest): boolean {
    return ADMIN_ROLES.includes((req.user.role || '').toLowerCase());
}

function errStatus(message: string): number {
    if (/not found/i.test(message)) return 404;
    if (/required|must be|Unknown criterion/i.test(message)) return 400;
    return 500;
}

export const getTemplate = async (req: AuthRequest, res: Response) => {
    try {
        const template = await ObservationService.getOrCreateDefaultTemplate(req.user.school_id);
        res.json(template);
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};

export const createObservation = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can record a classroom observation' });
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await ObservationService.createObservation(req.user.school_id, branchId, req.body, req.user.id);
        res.status(201).json(result);
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};

export const getObservationsForTeacherAdmin = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can view observation history' });
        const result = await ObservationService.getObservationsForTeacher(req.user.school_id, req.params.teacherId as string);
        res.json(result);
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};

export const getMyObservations = async (req: AuthRequest, res: Response) => {
    try {
        const teacher = await prisma.teacher.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
        if (!teacher) return res.json([]);
        const result = await ObservationService.getObservationsForTeacher(req.user.school_id, teacher.id);
        res.json(result);
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};
