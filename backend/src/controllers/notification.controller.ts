import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { NotificationService } from '../services/notification.service';

export const createNotification = async (req: AuthRequest, res: Response) => {
    try {
        const result = await NotificationService.createNotification(req.user.school_id, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getMyNotifications = async (req: AuthRequest, res: Response) => {
    try {
        // Assuming user roles are mapped to audience types
        const audience = [req.user.role]; 
        const result = await NotificationService.getNotificationsForUser(req.user.school_id, req.user.id, audience);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
    try {
        const result = await NotificationService.markAsRead(req.user.school_id, req.params.id as string);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
