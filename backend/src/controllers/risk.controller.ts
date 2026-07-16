import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { RiskService } from '../services/risk.service';
import prisma from '../config/database';
import { getEffectiveBranchId } from '../utils/branchScope';

const ADMIN_ROLES = ['admin', 'proprietor', 'superadmin', 'super_admin'];

function isAdmin(req: AuthRequest): boolean {
    return ADMIN_ROLES.includes((req.user.role || '').toLowerCase());
}

function errStatus(message: string): number {
    if (/not found/i.test(message)) return 404;
    if (/already/i.test(message)) return 400;
    return 500;
}

export const getFlaggedStudents = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can view the at-risk students list' });
        const branchId = getEffectiveBranchId(req.user, (req.query.branchId || req.query.branch_id) as string);
        const result = await RiskService.getFlaggedStudents(req.user.school_id, branchId, {
            level: req.query.level as string,
            classId: req.query.classId as string,
        });
        res.json(result);
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};

export const getMyFlaggedStudents = async (req: AuthRequest, res: Response) => {
    try {
        const teacher = await prisma.teacher.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
        if (!teacher) return res.json([]);
        const result = await RiskService.getFlaggedStudentsForTeacher(req.user.school_id, teacher.id);
        res.json(result);
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};

export const getMyChildrenRisk = async (req: AuthRequest, res: Response) => {
    try {
        const parent = await prisma.parent.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
        if (!parent) return res.json([]);
        const result = await RiskService.getFlaggedStudentsForParent(req.user.school_id, parent.id);
        res.json(result);
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};

export const runManualScan = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can trigger a risk scan' });
        const result = await RiskService.runScanForSchool(req.user.school_id);
        res.json(result);
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};

export const resolveFlag = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can resolve a risk flag' });
        const result = await RiskService.resolveFlag(req.user.school_id, req.params.id as string, req.user.id);
        res.json(result);
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};
