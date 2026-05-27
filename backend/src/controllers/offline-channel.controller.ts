import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { OfflineChannelService } from '../services/offline-channel.service';

export class OfflineChannelController {
    // Radio
    static async getRadioContent(req: AuthRequest, res: Response) {
        try {
            const data = await OfflineChannelService.getRadioContent(req.user.school_id);
            res.json({ data, error: null });
        } catch (error: any) {
            res.status(500).json({ data: null, error: error.message });
        }
    }

    static async createRadioContent(req: AuthRequest, res: Response) {
        try {
            const data = await OfflineChannelService.createRadioContent(req.user.school_id, req.body);
            res.status(201).json({ data, error: null });
        } catch (error: any) {
            res.status(500).json({ data: null, error: error.message });
        }
    }

    static async getRadioBroadcasts(req: AuthRequest, res: Response) {
        try {
            const data = await OfflineChannelService.getRadioBroadcasts(req.user.school_id);
            res.json({ data, error: null });
        } catch (error: any) {
            res.status(500).json({ data: null, error: error.message });
        }
    }

    static async getRadioPartners(req: AuthRequest, res: Response) {
        try {
            const data = await OfflineChannelService.getRadioPartners(req.user.school_id);
            res.json({ data, error: null });
        } catch (error: any) {
            res.status(500).json({ data: null, error: error.message });
        }
    }

    // IVR
    static async getIVRLessons(req: AuthRequest, res: Response) {
        try {
            const data = await OfflineChannelService.getIVRLessons(req.user.school_id);
            res.json({ data, error: null });
        } catch (error: any) {
            res.status(500).json({ data: null, error: error.message });
        }
    }

    static async createIVRLesson(req: AuthRequest, res: Response) {
        try {
            const data = await OfflineChannelService.createIVRLesson(req.user.school_id, req.body);
            res.status(201).json({ data, error: null });
        } catch (error: any) {
            res.status(500).json({ data: null, error: error.message });
        }
    }

    static async getIVRCalls(req: AuthRequest, res: Response) {
        try {
            const data = await OfflineChannelService.getIVRCalls(req.user.school_id);
            res.json({ data, error: null });
        } catch (error: any) {
            res.status(500).json({ data: null, error: error.message });
        }
    }

    // SMS
    static async getSMSLessons(req: AuthRequest, res: Response) {
        try {
            const data = await OfflineChannelService.getSMSLessons(req.user.school_id);
            res.json({ data, error: null });
        } catch (error: any) {
            res.status(500).json({ data: null, error: error.message });
        }
    }

    static async createSMSLesson(req: AuthRequest, res: Response) {
        try {
            const data = await OfflineChannelService.createSMSLesson(req.user.school_id, req.body);
            res.status(201).json({ data, error: null });
        } catch (error: any) {
            res.status(500).json({ data: null, error: error.message });
        }
    }

    static async getSMSSchedules(req: AuthRequest, res: Response) {
        try {
            const data = await OfflineChannelService.getSMSSchedules(req.user.school_id);
            res.json({ data, error: null });
        } catch (error: any) {
            res.status(500).json({ data: null, error: error.message });
        }
    }

    // USSD
    static async getUSSDMenus(req: AuthRequest, res: Response) {
        try {
            const data = await OfflineChannelService.getUSSDMenus(req.user.school_id);
            res.json({ data, error: null });
        } catch (error: any) {
            res.status(500).json({ data: null, error: error.message });
        }
    }

    static async getUSSDSessions(req: AuthRequest, res: Response) {
        try {
            const data = await OfflineChannelService.getUSSDSessions(req.user.school_id);
            res.json({ data, error: null });
        } catch (error: any) {
            res.status(500).json({ data: null, error: error.message });
        }
    }

    static async getUSSDTransactions(req: AuthRequest, res: Response) {
        try {
            const data = await OfflineChannelService.getUSSDTransactions(req.user.school_id);
            res.json({ data, error: null });
        } catch (error: any) {
            res.status(500).json({ data: null, error: error.message });
        }
    }
}
