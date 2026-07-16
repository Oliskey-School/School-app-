import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { SuspensionService } from '../services/suspension.service';
import prisma from '../config/database';
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

/** Admin views one student's suspension history (for the student profile page). */
export const getStudentSuspensions = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can view suspension records' });
        const branchId = getEffectiveBranchId(req.user, (req.query.branchId || req.query.branch_id) as string);
        await SuspensionService.getScopedStudent(req.user.school_id, req.params.studentId as string, branchId);
        const result = await SuspensionService.listForStudent(req.user.school_id, req.params.studentId as string);
        res.json(result);
    } catch (error: any) {
        res.status(errStatus(error.message)).json({ message: error.message });
    }
};

export const issueSuspension = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can issue suspensions' });
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await SuspensionService.issueSuspension(
            req.user.school_id, req.body, { id: req.user.id, name: req.user.full_name }, branchId
        );
        res.status(201).json(result);
    } catch (error: any) {
        res.status(errStatus(error.message)).json({ message: error.message });
    }
};

export const confirmReturn = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can confirm a return from suspension' });
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await SuspensionService.confirmReturn(req.user.school_id, req.params.id as string, req.body, req.user.id, branchId);
        res.json(result);
    } catch (error: any) {
        res.status(errStatus(error.message)).json({ message: error.message });
    }
};

export const listSuspensions = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can view the suspension list' });
        const branchId = getEffectiveBranchId(req.user, (req.query.branchId || req.query.branch_id) as string);
        const result = await SuspensionService.listForSchool(req.user.school_id, branchId);
        res.json(result);
    } catch (error: any) {
        res.status(errStatus(error.message)).json({ message: error.message });
    }
};

/** The logged-in student sees their own suspension letters. */
export const getMySuspensions = async (req: AuthRequest, res: Response) => {
    try {
        const student = await prisma.student.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
        if (!student) return res.status(403).json({ message: 'No student profile found for this account' });
        const result = await SuspensionService.listForStudent(req.user.school_id, student.id);
        res.json(result);
    } catch (error: any) {
        res.status(errStatus(error.message)).json({ message: error.message });
    }
};

/** A parent sees suspension letters for all their linked children. */
export const getChildSuspensions = async (req: AuthRequest, res: Response) => {
    try {
        const parent = await prisma.parent.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
        if (!parent) return res.status(403).json({ message: 'No parent profile found for this account' });

        const links = await prisma.parentChild.findMany({
            where: { parent_id: parent.id, school_id: req.user.school_id, deleted_at: null },
            include: { student: { select: { id: true, full_name: true } } },
        });

        const results = [];
        for (const link of links) {
            if (!link.student) continue;
            const suspensions = await SuspensionService.listForStudent(req.user.school_id, link.student.id);
            for (const s of suspensions) {
                results.push({ ...s, student_name: link.student.full_name });
            }
        }
        res.json(results);
    } catch (error: any) {
        res.status(errStatus(error.message)).json({ message: error.message });
    }
};
