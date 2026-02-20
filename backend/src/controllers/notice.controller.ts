import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { NoticeService } from '../services/notice.service';

export const getNotices = async (req: AuthRequest, res: Response) => {
    try {
        const result = await NoticeService.getNotices(req.user.school_id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createNotice = async (req: AuthRequest, res: Response) => {
    try {
        const result = await NoticeService.createNotice(req.user.school_id, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const deleteNotice = async (req: AuthRequest, res: Response) => {
    try {
        await NoticeService.deleteNotice(req.user.school_id, req.params.id as string);
        res.status(204).send();
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};
