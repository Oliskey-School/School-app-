import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { TimelineService } from '../services/timeline.service';
import { getEffectiveBranchId } from '../utils/branchScope';

const ADMIN_ROLES = ['admin', 'proprietor', 'superadmin', 'super_admin'];

function isAdmin(req: AuthRequest): boolean {
    return ADMIN_ROLES.includes((req.user.role || '').toLowerCase());
}

function errStatus(message: string): number {
    if (/not found/i.test(message)) return 404;
    if (/required|must be|Only manually/i.test(message)) return 400;
    return 500;
}

export const getStudentTimeline = async (req: AuthRequest, res: Response) => {
    try {
        const result = await TimelineService.getStudentTimeline(req.user.school_id, req.params.id as string);
        res.json(result);
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};

export const getTeacherTimeline = async (req: AuthRequest, res: Response) => {
    try {
        const result = await TimelineService.getTeacherTimeline(req.user.school_id, req.params.id as string);
        res.json(result);
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};

export const addEvent = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can add timeline entries' });
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await TimelineService.addManualEvent(req.user.school_id, branchId, req.body, req.user.id);
        res.status(201).json(result);
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};

export const deleteEvent = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can remove timeline entries' });
        await TimelineService.deleteManualEvent(req.user.school_id, req.params.id as string);
        res.status(204).send();
    } catch (error: any) { res.status(errStatus(error.message)).json({ message: error.message }); }
};
