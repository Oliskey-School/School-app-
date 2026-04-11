import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ResourceService } from '../services/resource.service';
import { getEffectiveBranchId } from '../utils/branchScope';

export const createResource = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.body?.branch_id);
        const result = await ResourceService.createResource(req.user.school_id, branchId, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getResources = async (req: AuthRequest, res: Response) => {
    try {
        const requestedBranch = (req.query.branch_id as string) || (req.query.branchId as string);
        const branchId = getEffectiveBranchId(req.user, requestedBranch);
        
        const filters = {
            category: req.query.category as string,
            subject: req.query.subject as string
        };
        
        const resources = await ResourceService.getResources(req.user.school_id, branchId, filters);
        res.json(resources);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteResource = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        await ResourceService.deleteResource(id as string);
        res.json({ message: 'Resource deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
