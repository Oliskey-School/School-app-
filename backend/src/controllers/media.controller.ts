import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { MediaService } from '../services/media.service';
import { storeUploadedFile } from '../services/fileStorage.service';
import { sendError } from '../utils/httpError';
import { verifyFileSignature } from '../utils/fileSignature';

// Server-decided extension for the VERIFIED type, never the client-supplied
// filename's extension — an attacker's own filename is not a trustworthy
// source for what a file gets served back as.
const EXTENSION_FOR_MIME: Record<string, string> = {
    'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp', 'image/bmp': '.bmp',
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/vnd.ms-powerpoint': '.ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
    'text/plain': '.txt', 'text/csv': '.csv',
    'audio/mpeg': '.mp3', 'audio/wav': '.wav', 'audio/webm': '.weba',
    'video/mp4': '.mp4', 'video/webm': '.webm',
};

// Sharp decodes the full pixel buffer before any resize option takes effect,
// so a tiny, highly-compressed "decompression bomb" image can exhaust memory
// during decode itself, before the 512x512 output cap ever applies. This caps
// the INPUT — sharp throws immediately instead of allocating for it. 4096x4096
// covers every real photo this app handles (avatars, resource images) with
// headroom, while a bomb decoding to e.g. 50000x50000 is refused outright.
const MAX_INPUT_PIXELS = 4096 * 4096;

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

        // The client's declared MIME type (from the multipart Content-Type) is
        // never trusted alone — upload.middleware.ts's fileFilter already
        // limits it to a fixed allowlist, but that allowlist check is itself
        // spoofable (rename shell.php to photo.jpg, claim image/jpeg). Verify
        // the ACTUAL bytes match, and reject known-dangerous content
        // (executables, scripts, HTML/SVG with embedded script) outright
        // regardless of what was claimed.
        const signature = verifyFileSignature(req.file.buffer, req.file.mimetype);
        if (!signature.ok) {
            console.warn(`[POST /media/upload] Rejected upload: ${signature.reason} (school=${req.user.school_id}, user=${req.user.id})`);
            return res.status(415).json({ message: 'File content does not match an allowed, verified file type.' });
        }

        const isAvatar = req.body.category === 'avatar';
        let uploadBuffer = req.file.buffer;
        let uploadMime = req.file.mimetype;
        const isImage = req.file.mimetype.startsWith('image/');

        if (isAvatar && !isImage) {
            return res.status(415).json({ message: 'Profile images must be JPEG, PNG, WebP, GIF, or BMP.' });
        }

        if (isImage) {
            // Every verified image — not just avatars — is decoded and
            // RE-ENCODED through sharp before it is ever stored. This is the
            // real safety boundary for images: re-encoding only preserves
            // actual pixel data, so anything appended/embedded after the
            // image data (a polyglot payload, non-standard metadata/EXIF
            // carrying scripts, a trailing archive) cannot survive into the
            // stored file. limitInputPixels caps memory used decoding a
            // "decompression bomb" — a tiny file whose declared dimensions
            // decode to an enormous canvas — by refusing before allocating
            // for it, not just capping the OUTPUT size afterwards.
            try {
                const pipeline = sharp(req.file.buffer, { failOn: 'none', limitInputPixels: MAX_INPUT_PIXELS })
                    .rotate(); // apply EXIF orientation, then strip EXIF by not requesting it back
                uploadBuffer = isAvatar
                    ? await pipeline.resize({ width: 512, height: 512, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82, effort: 4 }).toBuffer()
                    : await pipeline.resize({ width: 4096, height: 4096, fit: 'inside', withoutEnlargement: true }).webp({ quality: 88, effort: 4 }).toBuffer();
                uploadMime = 'image/webp';
            } catch (imgErr: any) {
                console.warn(`[POST /media/upload] Image failed safe re-encode: ${imgErr?.message} (school=${req.user.school_id})`);
                return res.status(415).json({ message: 'Could not process this image — it may be corrupted or exceed size limits.' });
            }

            if (isAvatar && uploadBuffer.length > 1024 * 1024) {
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

        // The filename is ALWAYS server-generated from the VERIFIED type —
        // never the client's original filename or its extension. A caller's
        // own filename is untrusted input; using it as (part of) a storage
        // path/filesystem path is exactly the class of bug that enables
        // traversal and extension-spoofing attacks.
        const randomName = crypto.randomBytes(16).toString('hex');
        const ext = EXTENSION_FOR_MIME[uploadMime] || '';
        let relativePath: string;
        if (isAvatar) {
            const branchId = String(req.user.active_branch_id || req.user.branch_id || 'all').replace(/[^a-zA-Z0-9_-]/g, '');
            const userId = String(req.user.id).replace(/[^a-zA-Z0-9_-]/g, '');
            // Avatars are looked up BY user id elsewhere (a stable, predictable
            // key is the point — "the current user's photo"), so this one path
            // intentionally keeps a deterministic name rather than a random one.
            relativePath = `${schoolId}/${branchId}/${userId}.webp`;
        } else {
            // The caller may still choose a FOLDER prefix (existing callers pass
            // things like "temp/<folder>/") for organization, but never the
            // filename itself. Every key is force-prefixed with the CALLER'S OWN
            // school id — a client-supplied path can no longer point outside its
            // own tenant's namespace no matter what it contains. Traversal
            // sequences and a leading slash are stripped on top of that as
            // defense in depth, not as the boundary.
            const rawPrefix = typeof req.body.path === 'string' ? req.body.path : '';
            const folder = rawPrefix
                .replace(/\.\./g, '')
                .replace(/^\/+/, '')
                .replace(/[^a-zA-Z0-9_\-/.]/g, '')
                .replace(/\/[^/]*$/, ''); // drop whatever filename segment the caller included, if any
            relativePath = `${schoolId}/${folder ? folder + '/' : ''}${randomName}${ext}`;
        }

        const { publicUrl } = await storeUploadedFile(uploadBuffer, uploadMime, bucket, relativePath);
        res.json({ publicUrl });
    } catch (error: any) {
        console.error('[POST /media/upload] File upload failed:', error);
        res.status(500).json({ message: 'File upload failed. Please try again.' });
    }
};

// Serving back whatever extension EXTENSION_FOR_MIME assigned at upload time —
// never anything derived from a client-controlled value at download time.
const MIME_FOR_EXTENSION: Record<string, string> = Object.fromEntries(
    Object.entries(EXTENSION_FOR_MIME).map(([mime, ext]) => [ext, mime]),
);

/**
 * Local-disk storage has no signed-URL mechanism of its own, so this route IS
 * the authorization boundary for it: every request re-checks that the
 * caller's OWN school_id matches the school segment embedded in the key
 * (authenticate + requireTenant already ran via media.routes.ts), rather than
 * relying on anything embedded in the URL itself. Only reached when the app
 * is running the local-disk fallback (SUPABASE_STORAGE_ENABLED / S3_ENABLED
 * both off) — storeUploadedFile only ever hands out /api/media/file/* URLs
 * in that mode.
 */
export const downloadFile = async (req: AuthRequest, res: Response) => {
    try {
        const segments = (req.params as any).splat as string[] | undefined;
        if (!segments || segments.length < 2) {
            return res.status(400).json({ message: 'Invalid file path.' });
        }
        // No segment may smuggle a traversal sequence, even though Express
        // already resolves each path segment independently.
        if (segments.some((s) => !s || s.includes('..'))) {
            return res.status(400).json({ message: 'Invalid file path.' });
        }

        const [bucket, schoolId] = segments;
        const userRole = String(req.user.role || '').toUpperCase();
        const isPlatformAdmin = userRole === 'SUPER_ADMIN';
        if (!isPlatformAdmin && schoolId !== String(req.user.school_id)) {
            // Same response for "not yours" and "doesn't exist" — a 403 vs 404
            // split here would let an attacker distinguish valid tenant paths
            // from invalid ones.
            return res.status(404).json({ message: 'File not found.' });
        }

        const key = segments.join('/');
        const filePath = path.join(process.cwd(), 'uploads', key);
        const uploadsRoot = path.join(process.cwd(), 'uploads');
        if (!filePath.startsWith(uploadsRoot + path.sep)) {
            return res.status(400).json({ message: 'Invalid file path.' });
        }
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'File not found.' });
        }

        const ext = path.extname(filePath).toLowerCase();
        const mime = MIME_FOR_EXTENSION[ext] || 'application/octet-stream';
        res.setHeader('Content-Type', mime);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        // 'attachment' for anything that isn't an image/audio/video the app
        // actually renders inline — an uploaded document should never be
        // opened as if it were part of the app's own origin.
        const inline = mime.startsWith('image/') || mime.startsWith('audio/') || mime.startsWith('video/');
        res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="${path.basename(filePath)}"`);
        res.setHeader('Cache-Control', 'private, max-age=3600');
        res.sendFile(filePath);
    } catch (error: any) {
        console.error('[GET /media/file] File download failed:', error);
        res.status(500).json({ message: 'File download failed.' });
    }
};
