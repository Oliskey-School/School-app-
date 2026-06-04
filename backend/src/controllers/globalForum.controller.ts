import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { GlobalForumService } from '../services/globalForum.service';

// Only teachers participate in the global community. Admins/super-admins may read
// and moderate but the space is meant for teacher-to-teacher collaboration.
const canPost = (req: AuthRequest) => (req.user?.role || '').toUpperCase() === 'TEACHER';
const canModerate = (req: AuthRequest) => (req.user?.role || '').toUpperCase() === 'SUPER_ADMIN';

export const getGlobalTopics = async (_req: AuthRequest, res: Response) => {
    try {
        res.json(await GlobalForumService.getTopics());
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createGlobalTopic = async (req: AuthRequest, res: Response) => {
    try {
        if (!canPost(req)) return res.status(403).json({ message: 'Only teachers can post in the global community' });
        const topic = await GlobalForumService.createTopic(req.user, req.body);
        res.status(201).json(topic);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const getGlobalPosts = async (req: AuthRequest, res: Response) => {
    try {
        res.json(await GlobalForumService.getPosts(req.params.id as string));
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createGlobalPost = async (req: AuthRequest, res: Response) => {
    try {
        if (!canPost(req)) return res.status(403).json({ message: 'Only teachers can reply in the global community' });
        const post = await GlobalForumService.createPost(req.user, req.body);
        res.status(201).json(post);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const deleteGlobalTopic = async (req: AuthRequest, res: Response) => {
    try {
        if (!canModerate(req)) return res.status(403).json({ message: 'Only the platform super admin can remove posts' });
        res.json(await GlobalForumService.deleteTopic(req.params.id as string));
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteGlobalPost = async (req: AuthRequest, res: Response) => {
    try {
        if (!canModerate(req)) return res.status(403).json({ message: 'Only the platform super admin can remove posts' });
        res.json(await GlobalForumService.deletePost(req.params.id as string));
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
