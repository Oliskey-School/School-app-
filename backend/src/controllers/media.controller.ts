import path from 'path';
import sharp from 'sharp';
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { MediaService } from '../services/media.service';
import { storeUploadedFile } from '../services/fileStorage.service';
import { sendError } from '../utils/httpError';

export const sendSMSLesson = async (req: AuthRequest, res: Response) => {
    try {
        const result = await MediaService.sendSMSLesson(req.user.school_id, req.body);
        res.json(result);
    } catch (error: any) {
        console.error('[POST /media/sms-lesson]', error);
        sendError(res, error, 'media.controller.ts');
    }
};

export const scheduleRadioBroadcast = async (req: AuthRequest, res: Response) => {
    try {
        const result = await MediaService.scheduleRadioBroadcast(req.user.school_id, req.body);
        res.json(result);
    } catch (error: any) {
        console.error('[POST /media/radio-broadcast]', error);
        sendError(res, error, 'media.controller.ts');
    }
};

export const recordIVRLesson = async (req: AuthRequest, res: Response) => {
    try {
        const result = await MediaService.recordIVRLesson(req.user.school_id, req.body);
        res.json(result);
    } catch (error: any) {
        console.error('[POST /media/ivr-lesson]', error);
        sendError(res, error, 'media.controller.ts');
    }
};
export const uploadFile = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        const isAvatar = req.body.category === 'avatar';
        let uploadBuffer = req.file.buffer;
        let uploadMime = req.file.mimetype;

        if (isAvatar) {
            if (!req.file.mimetype.startsWith('image/')) {
                return res.status(415).json({ message: 'Profile images must be JPEG, PNG, WebP, GIF, or BMP.' });
                }

            uploadBuffer = await sharp(req.file.buffer, { failOn: 'none' })
                .rotate()
                .resize({ width: 512, height: 512, fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 82, effort: 4 })
                .toBuffer();
            uploadMime = 'image/webp';

            if (uploadBuffer.length > 1024 * 1024) {
                return res.status(413).json({ message: 'Profile image is still too large after compression. Please choose a smaller image.' });
                }
            }
        const bucket = isAvatar ? 'avatars' : (req.body.bucket || 'general');

        // Same naming rule multer's old diskStorage callback used: an
        // explicit path from the client (sanitized against traversal) or a
        // generated unique name.
        let relativePath: string;
        if (isAvatar) {
            const schoolId = String(req.user.school_id).replace(/[^a-zA-Z0-9_-]/g, '');
            const branchId = String(req.user.active_branch_id || req.user.branch_id || 'all').replace(/[^a-zA-Z0-9_-]/g, '');
            const userId = String(req.user.id).replace(/[^a-zA-Z0-9_-]/g, '');
            relativePath = `${schoolId}/${branchId}/${userId}.webp`;
        } else if (req.body.path) {
            const safePath = String(req.body.path).replace(/\.\./g, '');
            relativePath = safePath;
        } else {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            relativePath = `file-${uniqueSuffix}${path.extname(req.file.originalname)}`;
        }

        const { publicUrl } = await storeUploadedFile(uploadBuffer, uploadMime, bucket, relativePath);
        res.json({ publicUrl });
    } catch (error: any) {
        console.error('[POST /media/upload] File upload failed:', error);
        res.status(500).json({ message: 'File upload failed. Please try again.' });
    }
};
