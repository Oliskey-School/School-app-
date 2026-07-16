import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AlumniService } from '../services/alumni.service';
import { getEffectiveBranchId } from '../utils/branchScope';

const ADMIN_ROLES = ['admin', 'proprietor', 'superadmin', 'super_admin'];

function isAdmin(req: AuthRequest): boolean {
    return ADMIN_ROLES.includes((req.user.role || '').toLowerCase());
}

function errStatus(message: string): number {
    if (/not found/i.test(message)) return 404;
    if (/required|must be|already/i.test(message)) return 400;
    return 500;
}

export const listPastStudents = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can view past students' });
        const branchId = getEffectiveBranchId(req.user, (req.query.branchId || req.query.branch_id) as string);
        const result = await AlumniService.listPastStudents(req.user.school_id, branchId, {
            year: req.query.year as string,
            status: req.query.status as string,
            search: req.query.search as string,
        });
        res.json(result);
    } catch (error: any) {
        res.status(errStatus(error.message)).json({ message: error.message });
    }
};

export const getPastStudentHistory = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can view alumni records' });
        const branchId = getEffectiveBranchId(req.user, (req.query.branchId || req.query.branch_id) as string);
        const result = await AlumniService.getHistory(req.user.school_id, req.params.studentId as string, branchId);
        res.json(result);
    } catch (error: any) {
        res.status(errStatus(error.message)).json({ message: error.message });
    }
};

export const markExit = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can mark a student as exited' });
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await AlumniService.markExit(req.user.school_id, req.params.studentId as string, req.body, req.user.id, branchId);
        res.json(result);
    } catch (error: any) {
        res.status(errStatus(error.message)).json({ message: error.message });
    }
};

export const updateExitInfo = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can edit alumni records' });
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await AlumniService.updateExitInfo(req.user.school_id, req.params.studentId as string, req.body, req.user.id, branchId);
        res.json(result);
    } catch (error: any) {
        res.status(errStatus(error.message)).json({ message: error.message });
    }
};
