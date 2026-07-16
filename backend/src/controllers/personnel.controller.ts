import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { PersonnelService } from '../services/personnel.service';
import prisma from '../config/database';
import { getEffectiveBranchId } from '../utils/branchScope';

const ADMIN_ROLES = ['admin', 'proprietor', 'superadmin', 'super_admin'];

function isAdmin(req: AuthRequest): boolean {
    return ADMIN_ROLES.includes((req.user.role || '').toLowerCase());
}

async function resolveOwnTeacherId(req: AuthRequest): Promise<string | null> {
    if (req.user.teacher_profile?.id) return req.user.teacher_profile.id;
    const teacher = await (prisma as any).teacher.findUnique({
        where: { user_id: req.user.id },
        select: { id: true }
    });
    return teacher?.id ?? null;
}

function errStatus(message: string): number {
    if (/not found/i.test(message)) return 404;
    if (/required|must be|already|only be edited|written response/i.test(message)) return 400;
    return 500;
}

/** Admins open any (scoped) teacher's file; a teacher opens only their own. */
export const getPersonnelFile = async (req: AuthRequest, res: Response) => {
    try {
        const { teacherId } = req.params;
        if (!isAdmin(req)) {
            const ownId = await resolveOwnTeacherId(req);
            if (!ownId || ownId !== teacherId) {
                return res.status(403).json({ message: 'You can only view your own personnel file' });
            }
            // Own file: no branch narrowing — the teacher sees their complete record.
            const file = await PersonnelService.getPersonnelFile(req.user.school_id, teacherId);
            return res.json(file);
        }
        const branchId = getEffectiveBranchId(req.user, (req.query.branchId || req.query.branch_id) as string);
        const file = await PersonnelService.getPersonnelFile(req.user.school_id, teacherId as string, branchId);
        res.json(file);
    } catch (error: any) {
        res.status(errStatus(error.message)).json({ message: error.message });
    }
};

export const getMyPersonnelFile = async (req: AuthRequest, res: Response) => {
    try {
        const ownId = await resolveOwnTeacherId(req);
        if (!ownId) return res.status(403).json({ message: 'No teacher profile found for this account' });
        const file = await PersonnelService.getPersonnelFile(req.user.school_id, ownId);
        res.json(file);
    } catch (error: any) {
        res.status(errStatus(error.message)).json({ message: error.message });
    }
};

export const createRecord = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can add personnel records' });
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const record = await PersonnelService.createRecord(req.user.school_id, req.body, req.user.id, branchId);
        res.status(201).json(record);
    } catch (error: any) {
        res.status(errStatus(error.message)).json({ message: error.message });
    }
};

export const updateRecord = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can edit personnel records' });
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const record = await PersonnelService.updateRecord(req.user.school_id, req.params.id as string, req.body, req.user.id, branchId);
        res.json(record);
    } catch (error: any) {
        res.status(errStatus(error.message)).json({ message: error.message });
    }
};

export const issueQueryLetter = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can issue query letters' });
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const letter = await PersonnelService.issueQueryLetter(
            req.user.school_id,
            req.body,
            { id: req.user.id, name: req.user.full_name },
            branchId
        );
        res.status(201).json(letter);
    } catch (error: any) {
        res.status(errStatus(error.message)).json({ message: error.message });
    }
};

export const respondToQueryLetter = async (req: AuthRequest, res: Response) => {
    try {
        const ownId = await resolveOwnTeacherId(req);
        if (!ownId) return res.status(403).json({ message: 'Only the addressed teacher can respond to a query letter' });
        const letter = await PersonnelService.respondToQueryLetter(
            req.user.school_id, req.params.id as string, ownId, req.body
        );
        res.json(letter);
    } catch (error: any) {
        res.status(errStatus(error.message)).json({ message: error.message });
    }
};

export const closeQueryLetter = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can close query letters' });
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const letter = await PersonnelService.closeQueryLetter(
            req.user.school_id, req.params.id as string, req.body, req.user.id, branchId
        );
        res.json(letter);
    } catch (error: any) {
        res.status(errStatus(error.message)).json({ message: error.message });
    }
};
