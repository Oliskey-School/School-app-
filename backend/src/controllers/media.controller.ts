import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { MediaService } from '../services/media.service';

export const sendSMSLesson = async (req: AuthRequest, res: Response) => {
    try {
        const result = await MediaService.sendSMSLesson(req.user.school_id, req.body);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const scheduleRadioBroadcast = async (req: AuthRequest, res: Response) => {
    try {
        const result = await MediaService.scheduleRadioBroadcast(req.user.school_id, req.body);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const recordIVRLesson = async (req: AuthRequest, res: Response) => {
    try {
        const result = await MediaService.recordIVRLesson(req.user.school_id, req.body);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
export const uploadFile = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const bucket = req.body.bucket || 'general';
        const filePath = req.body.path || req.file.filename;

        // Relative path: /uploads is served same-origin (see app.ts static
        // mount + deploy/nginx.conf), so the browser resolves this against
        // whatever host it's already on — no hardcoded host/protocol needed.
        const publicUrl = `/uploads/${bucket}/${filePath}`;

        res.json({ publicUrl });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
