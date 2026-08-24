import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { SchoolService } from '../services/school.service';
import { getEffectiveBranchId, getDemoSessionRoot } from '../utils/branchScope';
import { isMainAdmin } from '../utils/permissions';
import * as BranchTransfer from '../services/branchTransfer.service';
import { sendError } from '../utils/httpError';

// Creating, renaming or removing branches is a school-wide action — Main Admin only.
const requireMainAdmin = (req: AuthRequest, res: Response): boolean => {
    if (!isMainAdmin(req.user)) {
        res.status(403).json({ message: 'Only the main admin can manage branches.' });
        return false;
    }
    return true;
};

export const getBranches = async (req: AuthRequest, res: Response) => {
    try {
        // Demo session: return this visitor's sandbox (root + the branches they created).
        const demoRoot = getDemoSessionRoot(req.user);
        if (demoRoot) {
            const result = await SchoolService.getBranches(req.user.school_id, undefined, demoRoot);
            return res.json(result);
        }
        const requestedBranchId = (req.query.branchId as string) || (req.query.branch_id as string);
        const headerBranchId = req.headers['x-branch-id'] as string | undefined;
        const branchId = getEffectiveBranchId(req.user, requestedBranchId, headerBranchId);
        const result = await SchoolService.getBranches(req.user.school_id, branchId);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'branch.controller.ts');
    }
};

// All branch labels in the school — for assignment pickers (any admin), e.g. a
// home-branch admin lending a teacher to another branch.
export const getBranchOptions = async (req: AuthRequest, res: Response) => {
    try {
        const demoRoot = getDemoSessionRoot(req.user);
        const result = await SchoolService.getBranchOptions(req.user.school_id, demoRoot);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'branch.controller.ts');
    }
};

export const createBranch = async (req: AuthRequest, res: Response) => {
    try {
        if (!requireMainAdmin(req, res)) return;
        const branchData = req.body;
        // In a demo session, new branches are scoped to the visitor's sandbox.
        const demoRoot = getDemoSessionRoot(req.user);
        const result = await SchoolService.createBranch(req.user.school_id, branchData, demoRoot);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const updateBranch = async (req: AuthRequest, res: Response) => {
    try {
        if (!requireMainAdmin(req, res)) return;
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
        if (!requireMainAdmin(req, res)) return;
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
        sendError(res, error, 'branch.controller.ts');
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
