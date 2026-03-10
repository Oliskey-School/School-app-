import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ResourceService } from '../services/resource.service';

export const createResource = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = req.user.branch_id || req.body.branch_id;
        const result = await ResourceService.createResource(req.user.school_id, branchId, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
