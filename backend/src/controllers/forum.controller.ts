import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ForumService } from '../services/forum.service';
import { getEffectiveBranchId } from '../utils/branchScope';
import { sendError } from '../utils/httpError';

export const getTopics = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.query.branch_id as string);
        const result = await ForumService.getTopics(req.user.school_id, branchId);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'forum.controller.ts');
    }
};

export const createTopic = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await ForumService.createTopic(req.user.school_id, branchId, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        sendError(res, error, 'forum.controller.ts');
    }
};

export const getPosts = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.query.branch_id as string);
        const result = await ForumService.getPosts(req.user.school_id, branchId, req.params.id as string);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'forum.controller.ts');
    }
};

export const createPost = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await ForumService.createPost(req.user.school_id, branchId, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        sendError(res, error, 'forum.controller.ts');
    }
};
