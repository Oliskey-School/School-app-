import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { EmergencyService } from '../services/emergency.service';

export const triggerEmergencyBroadcast = async (req: AuthRequest, res: Response) => {
    try {
        const result = await EmergencyService.triggerEmergencyBroadcast(req.user.school_id, {
            ...req.body,
            sentBy: req.user.id,
        });
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const getEmergencyHistory = async (req: AuthRequest, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 20;
        const history = await EmergencyService.getBroadcastHistory(req.user.school_id, limit);
        res.json(history);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
