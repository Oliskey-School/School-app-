import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { SOPService } from '../services/sop.service';
import prisma from '../config/database';
import { getEffectiveBranchId } from '../utils/branchScope';

const ADMIN_ROLES = ['admin', 'proprietor', 'superadmin', 'super_admin'];

function isAdmin(req: AuthRequest): boolean {
    return ADMIN_ROLES.includes((req.user.role || '').toLowerCase());
}

function errStatus(message: string): number {
    if (/not found/i.test(message)) return 404;
    if (/only be|already|no longer|must be|no active|no workflow/i.test(message)) return 400;
    return 500;
}

async function resolveTeacherId(req: AuthRequest): Promise<string | null> {
    if (req.user.teacher_profile?.id) return req.user.teacher_profile.id;
    const teacher = await (prisma as any).teacher.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
    return teacher?.id ?? null;
}

// ---------- Incident types / workflow builder (admin) ----------

export const getIncidentTypes = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, (req.query.branchId || req.query.branch_id) as string);
        res.json(await SOPService.getIncidentTypes(req.user.school_id, branchId));
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};

export const createIncidentType = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can create incident types' });
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await SOPService.createIncidentType(req.user.school_id, req.body, req.user.id, branchId);
        res.status(201).json(result);
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};

export const updateIncidentType = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can edit incident types' });
        const result = await SOPService.updateIncidentType(req.user.school_id, req.params.id as string, req.body, req.user.id);
        res.json(result);
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};

export const deactivateIncidentType = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can deactivate incident types' });
        const result = await SOPService.deactivateIncidentType(req.user.school_id, req.params.id as string, req.user.id);
        res.json(result);
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};

// ---------- Cases ----------

export const reportCase = async (req: AuthRequest, res: Response) => {
    try {
        const role = (req.user.role || '').toLowerCase();
        if (role !== 'admin' && role !== 'teacher' && !ADMIN_ROLES.includes(role)) {
            return res.status(403).json({ message: 'Only admins and teachers can report incidents' });
        }
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await SOPService.reportCase(req.user.school_id, branchId, req.body, { id: req.user.id, role: req.user.role });
        res.status(201).json(result);
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};

export const getCases = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, (req.query.branchId || req.query.branch_id) as string);
        const filters = { status: req.query.status as string, incidentTypeId: req.query.incidentTypeId as string };

        if (isAdmin(req)) {
            return res.json(await SOPService.getCases(req.user.school_id, branchId, filters));
        }
        // Teachers see only cases they reported.
        const result = await SOPService.getCases(req.user.school_id, branchId, { ...filters, reportedBy: req.user.id });
        res.json(result);
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};

export const getCaseDetail = async (req: AuthRequest, res: Response) => {
    try {
        const caseRow = await SOPService.getCaseDetail(req.user.school_id, req.params.id as string);
        if (!isAdmin(req)) {
            const teacherId = await resolveTeacherId(req);
            const allowed = teacherId && SOPService.canTeacherViewCase(caseRow, teacherId, req.user.id);
            if (!allowed) return res.status(403).json({ message: 'You do not have access to this case' });
        }
        res.json(caseRow);
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};

export const advanceStage = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can advance a case' });
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await SOPService.advanceStage(req.user.school_id, branchId, req.params.id as string, req.user.id, req.body.notes);
        res.json(result);
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};

export const addEvidence = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) {
            const caseRow = await SOPService.getCaseDetail(req.user.school_id, req.params.id as string);
            const teacherId = await resolveTeacherId(req);
            const allowed = teacherId && SOPService.canTeacherViewCase(caseRow, teacherId, req.user.id);
            if (!allowed) return res.status(403).json({ message: 'You do not have access to this case' });
        }
        const result = await SOPService.addEvidence(req.user.school_id, req.params.id as string, req.body, req.user.id);
        res.status(201).json(result);
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};

export const recordDecision = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can record a decision' });
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await SOPService.recordDecision(req.user.school_id, branchId, req.params.id as string, req.body, { id: req.user.id, name: req.user.full_name });
        res.status(201).json(result);
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};

export const generateLetter = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can generate a letter' });
        const result = await SOPService.generateLetterDraft(req.user.school_id, req.params.id as string, req.body, req.user.id);
        res.status(201).json(result);
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};

export const updateLetter = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can edit a letter' });
        const result = await SOPService.updateLetter(req.user.school_id, req.params.letterId as string, req.body);
        res.json(result);
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};

export const sendLetter = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can send a letter' });
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await SOPService.sendLetter(req.user.school_id, branchId, req.params.letterId as string, req.user.id);
        res.json(result);
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};
