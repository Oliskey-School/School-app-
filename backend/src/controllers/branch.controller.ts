import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { SchoolService } from '../services/school.service';

export const getBranches = async (req: AuthRequest, res: Response) => {
    try {
        const result = await SchoolService.getBranches(req.user.school_id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createBranch = async (req: AuthRequest, res: Response) => {
    try {
        const branchData = req.body;
        const result = await SchoolService.createBranch(req.user.school_id, branchData);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const updateBranch = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const updates = req.body;
        const result = await SchoolService.updateBranch(req.user.school_id, id, updates);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const deleteBranch = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        await SchoolService.deleteBranch(req.user.school_id, id);
        res.status(204).send();
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};
