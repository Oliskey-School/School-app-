import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { PolicyService } from '../services/policy.service';

export const getPolicies = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const result = await PolicyService.getPolicies(schoolId);
        res.json({ data: result, error: null });
    } catch (error: any) {
        res.status(500).json({ data: null, error: error.message });
    }
};

export const createPolicy = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const result = await PolicyService.createPolicy(schoolId, req.body);
        res.status(201).json({ data: result, error: null });
    } catch (error: any) {
        res.status(500).json({ data: null, error: error.message });
    }
};

export const deletePolicy = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const { id } = req.params;
        await PolicyService.deletePolicy(schoolId, id as string);
        res.json({ data: { success: true }, error: null });
    } catch (error: any) {
        res.status(500).json({ data: null, error: error.message });
    }
};

export const getPermissionSlips = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const result = await PolicyService.getPermissionSlips(schoolId);
        res.json({ data: result, error: null });
    } catch (error: any) {
        res.status(500).json({ data: null, error: error.message });
    }
};

export const createPermissionSlip = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const result = await PolicyService.createPermissionSlip(schoolId, req.body);
        res.status(201).json({ data: result, error: null });
    } catch (error: any) {
        res.status(500).json({ data: null, error: error.message });
    }
};

export const bulkCreatePermissionSlips = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const { slips } = req.body;
        const result = await PolicyService.bulkCreatePermissionSlips(schoolId, slips);
        res.status(201).json({ data: result, error: null });
    } catch (error: any) {
        res.status(500).json({ data: null, error: error.message });
    }
};
export const updatePermissionSlip = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user.school_id;
        const { id } = req.params;
        const result = await PolicyService.updatePermissionSlip(schoolId, id as string, req.body);
        res.json({ data: result, error: null });
    } catch (error: any) {
        res.status(500).json({ data: null, error: error.message });
    }
};
