import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { MaintenanceService } from '../services/maintenance.service';

export const getTickets = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const { branchId } = req.query;
        const result = await MaintenanceService.getTickets(schoolId, branchId as string);
        res.json({ data: result, error: null });
    } catch (error: any) {
        res.status(500).json({ data: null, error: error.message });
    }
};

export const createTicket = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const result = await MaintenanceService.createTicket(schoolId, req.body);
        res.status(201).json({ data: result, error: null });
    } catch (error: any) {
        res.status(500).json({ data: null, error: error.message });
    }
};

export const updateTicket = async (req: AuthRequest, res: Response) => {
    try {
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
        const schoolId = req.user.school_id;
        const { id } = req.params;
        await MaintenanceService.deleteTicket(schoolId, id as string);
        res.json({ data: { success: true }, error: null });
    } catch (error: any) {
        res.status(500).json({ data: null, error: error.message });
    }
};
