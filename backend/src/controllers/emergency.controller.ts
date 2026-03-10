import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { EmergencyService } from '../services/emergency.service';

export const triggerEmergencyBroadcast = async (req: AuthRequest, res: Response) => {
    try {
        const result = await EmergencyService.triggerEmergencyBroadcast(req.user.school_id, req.body);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
