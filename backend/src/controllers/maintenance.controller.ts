import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { MaintenanceService } from '../services/maintenance.service';
import { getEffectiveBranchId } from '../utils/branchScope';

const ADMIN_ROLES = ['admin', 'proprietor', 'superadmin', 'super_admin'];

function isAdmin(req: AuthRequest): boolean {
    return ADMIN_ROLES.includes((req.user.role || '').toLowerCase());
}

function errStatus(message: string): number {
    if (/not found/i.test(message)) return 404;
    if (/required|Cannot move/i.test(message)) return 400;
    return 500;
}

export const getTickets = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user, (req.query.branchId || req.query.branch_id) as string);
        const reportedBy = req.query.mine === 'true' ? req.user.id : undefined;
        const result = await MaintenanceService.getTickets(schoolId, branchId as string, reportedBy);
        res.json(Array.isArray(result) ? result : []);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createTicket = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await MaintenanceService.createTicket(schoolId, branchId, req.body, req.user.id);
        res.status(201).json({ data: result, error: null });
    } catch (error: any) {
        res.status(errStatus(error.message)).json({ data: null, error: error.message, message: error.message });
    }
};

export const updateStatus = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can update ticket status' });
        const schoolId = req.user.school_id;
        const result = await MaintenanceService.updateStatus(schoolId, req.params.id as string, req.body.status);
        res.json({ data: result, error: null });
    } catch (error: any) {
        res.status(errStatus(error.message)).json({ data: null, error: error.message, message: error.message });
    }
};

export const updateTicket = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can edit tickets' });
        const schoolId = req.user.school_id;
        const { id } = req.params;
        const result = await MaintenanceService.updateTicket(schoolId, id as string, req.body);
        res.json({ data: result, error: null });
    } catch (error: any) {
        res.status(500).json({ data: null, error: error.message });
    }
};

export const deleteTicket = async (req: AuthRequest, res: Response) => {
    try {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Only admins can delete tickets' });
        const schoolId = req.user.school_id;
        const { id } = req.params;
        await MaintenanceService.deleteTicket(schoolId, id as string);
        res.json({ data: { success: true }, error: null });
    } catch (error: any) {
        res.status(500).json({ data: null, error: error.message });
    }
};
