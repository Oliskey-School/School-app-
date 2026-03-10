import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { CalendarService } from '../services/calendar.service';

export const getCalendarEvents = async (req: AuthRequest, res: Response) => {
    try {
        const result = await CalendarService.getCalendarEvents(req.user.school_id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
