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
        // The bucket name becomes part of the object key/URL, so it must come from
        // a fixed list — not the request. An arbitrary bucket combined with the
        // arbitrary path below (before this fix) meant any authenticated caller,
        // any role, any school, could pick BOTH halves of another tenant's storage
        // key and overwrite it.
        const ALLOWED_BUCKETS = new Set(['avatars', 'general', 'teacher-documents', 'student-documents', 'resources']);
        const requestedBucket = typeof req.body.bucket === 'string' ? req.body.bucket : undefined;
        const bucket = isAvatar ? 'avatars' : (requestedBucket && ALLOWED_BUCKETS.has(requestedBucket) ? requestedBucket : 'general');

        const schoolId = String(req.user.school_id).replace(/[^a-zA-Z0-9_-]/g, '');

        // Same naming rule multer's old diskStorage callback used: an
        // explicit path from the client (sanitized against traversal) or a
        // generated unique name.
        let relativePath: string;
        if (isAvatar) {
            const branchId = String(req.user.active_branch_id || req.user.branch_id || 'all').replace(/[^a-zA-Z0-9_-]/g, '');
            const userId = String(req.user.id).replace(/[^a-zA-Z0-9_-]/g, '');
            relativePath = `${schoolId}/${branchId}/${userId}.webp`;
        } else if (req.body.path) {
            // The caller may choose the FOLDER/FILENAME portion (existing callers
            // pass things like "temp/<folder>/<file>.pdf"), but every key is
            // force-prefixed with the CALLER'S OWN school id — a client-supplied
            // path can no longer point outside its own tenant's namespace no
            // matter what it contains. Traversal sequences and a leading slash are
            // stripped on top of that as defense in depth, not as the boundary.
            const cleaned = String(req.body.path).replace(/\.\./g, '').replace(/^\/+/, '');
            relativePath = `${schoolId}/${cleaned}`;
        } else {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            relativePath = `${schoolId}/file-${uniqueSuffix}${path.extname(req.file.originalname)}`;
        }

        const { publicUrl } = await storeUploadedFile(uploadBuffer, uploadMime, bucket, relativePath);
        res.json({ publicUrl });
    } catch (error: any) {
        console.error('[POST /media/upload] File upload failed:', error);
        res.status(500).json({ message: 'File upload failed. Please try again.' });
    }
};
