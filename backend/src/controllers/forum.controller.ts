import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ForumService } from '../services/forum.service';

export const getTopics = async (req: AuthRequest, res: Response) => {
    try {
        const result = await ForumService.getTopics(req.user.school_id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createTopic = async (req: AuthRequest, res: Response) => {
    try {
        const result = await ForumService.createTopic(req.user.school_id, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getPosts = async (req: AuthRequest, res: Response) => {
    try {
        const result = await ForumService.getPosts(req.params.id as string);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createPost = async (req: AuthRequest, res: Response) => {
    try {
        const result = await ForumService.createPost(req.user.school_id, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
