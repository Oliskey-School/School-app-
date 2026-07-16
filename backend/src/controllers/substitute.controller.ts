import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { SubstituteService } from '../services/substitute.service';
import prisma from '../config/database';
import { getEffectiveBranchId } from '../utils/branchScope';

const ADMIN_ROLES = ['admin', 'proprietor', 'superadmin', 'super_admin'];

function isAdmin(req: AuthRequest): boolean {
    return ADMIN_ROLES.includes((req.user.role || '').toLowerCase());
}

function errStatus(message: string): number {
    if (/not found/i.test(message)) return 404;
    if (/already|required|not addressed|already has a class/i.test(message)) return 400;
    return 500;
}

async function resolveTeacherId(req: AuthRequest): Promise<string | null> {
    if (req.user.teacher_profile?.id) return req.user.teacher_profile.id;
    const teacher = await (prisma as any).teacher.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
    return teacher?.id ?? null;
}

export const getCoverageNeeded = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can view substitute coverage' });
        const branchId = getEffectiveBranchId(req.user, (req.query.branchId || req.query.branch_id) as string);
        const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
        const result = await SubstituteService.getCoverageNeeded(req.user.school_id, branchId, date);
        res.json(result);
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};

export const assignSubstitute = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can assign substitutes' });
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await SubstituteService.assignSubstitute(req.user.school_id, branchId, req.body, req.user.id);
        res.status(201).json(result);
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};

export const getHistory = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can view substitute history' });
        const branchId = getEffectiveBranchId(req.user, (req.query.branchId || req.query.branch_id) as string);
        const result = await SubstituteService.getHistory(req.user.school_id, branchId, { date: req.query.date as string });
        res.json(result);
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};

export const getMyAssignments = async (req: AuthRequest, res: Response) => {
    try {
        const teacherId = await resolveTeacherId(req);
        if (!teacherId) return res.json([]);
        const result = await SubstituteService.getMyAssignments(req.user.school_id, teacherId);
        res.json(result);
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};

export const respondToAssignment = async (req: AuthRequest, res: Response) => {
    try {
        const teacherId = await resolveTeacherId(req);
        if (!teacherId) return res.status(403).json({ message: 'No teacher profile found for this account' });
        const response = req.body.response === 'Accepted' ? 'Accepted' : req.body.response === 'Declined' ? 'Declined' : null;
        if (!response) return res.status(400).json({ message: 'Response must be Accepted or Declined' });
        const result = await SubstituteService.respondToAssignment(req.user.school_id, req.params.id as string, teacherId, response);
        res.json(result);
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};
