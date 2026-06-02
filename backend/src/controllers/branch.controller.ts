import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { SchoolService } from '../services/school.service';
import { getEffectiveBranchId } from '../utils/branchScope';
import * as BranchTransfer from '../services/branchTransfer.service';

export const getBranches = async (req: AuthRequest, res: Response) => {
    try {
        const requestedBranchId = (req.query.branchId as string) || (req.query.branch_id as string);
        const headerBranchId = req.headers['x-branch-id'] as string | undefined;
        const branchId = getEffectiveBranchId(req.user, requestedBranchId, headerBranchId);
        const result = await SchoolService.getBranches(req.user.school_id, branchId);
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

/** Branches the authenticated user is authorized to see/operate in. */
export const getAuthorizedBranches = async (req: AuthRequest, res: Response) => {
    try {
        const result = await BranchTransfer.getAuthorizedBranches(req.user);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Transfer a user to another primary branch and/or set their additional
 * authorized branches. Restricted to the MAIN branch administrator.
 */
export const transferUser = async (req: AuthRequest, res: Response) => {
    try {
        if (!BranchTransfer.isMainAdmin(req.user)) {
            return res.status(403).json({ message: 'Only the main branch administrator can transfer or reassign users.' });
        }
        const result = await BranchTransfer.transferUser(req.user, req.body || {});
        res.json(result);
    } catch (error: any) {
        res.status(error?.status || 400).json({ message: error.message });
    }
};
