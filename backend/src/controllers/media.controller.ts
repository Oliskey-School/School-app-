import path from 'path';
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { MediaService } from '../services/media.service';
import { storeUploadedFile } from '../services/fileStorage.service';

export const sendSMSLesson = async (req: AuthRequest, res: Response) => {
    try {
        const result = await MediaService.sendSMSLesson(req.user.school_id, req.body);
        res.json(result);
    } catch (error: any) {
        console.error('[POST /media/sms-lesson]', error);
        res.status(500).json({ message: error.message });
    }
};

export const scheduleRadioBroadcast = async (req: AuthRequest, res: Response) => {
    try {
        const result = await MediaService.scheduleRadioBroadcast(req.user.school_id, req.body);
        res.json(result);
    } catch (error: any) {
        console.error('[POST /media/radio-broadcast]', error);
        res.status(500).json({ message: error.message });
    }
};

export const recordIVRLesson = async (req: AuthRequest, res: Response) => {
    try {
        const result = await MediaService.recordIVRLesson(req.user.school_id, req.body);
        res.json(result);
    } catch (error: any) {
        console.error('[POST /media/ivr-lesson]', error);
        res.status(500).json({ message: error.message });
    }
};
export const uploadFile = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const bucket = req.body.bucket || 'general';

        // Same naming rule multer's old diskStorage callback used: an
        // explicit path from the client (sanitized against traversal) or a
        // generated unique name.
        let relativePath: string;
        if (req.body.path) {
            const safePath = String(req.body.path).replace(/\.\./g, '');
            relativePath = safePath;
        } else {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            relativePath = `file-${uniqueSuffix}${path.extname(req.file.originalname)}`;
        }

        const { publicUrl } = await storeUploadedFile(req.file.buffer, req.file.mimetype, bucket, relativePath);
        res.json({ publicUrl });
    } catch (error: any) {
        console.error('[POST /media/upload] File upload failed:', error);
        res.status(500).json({ message: 'File upload failed. Please try again.' });
    }
};
