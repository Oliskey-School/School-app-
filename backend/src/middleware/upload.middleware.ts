import multer from 'multer';
import { Request, Response, NextFunction } from 'express';

// Buffered in memory instead of written straight to local disk: the
// controller (media.controller.ts) decides where the buffer actually goes —
// object storage (S3-compatible) when configured, local disk as a fallback
// otherwise. A single storage engine can't serve both, and the destination
// is a deploy-time config choice, not something multer itself should decide.
// The cap below keeps the in-memory buffer bounded.
const storage = multer.memoryStorage();

// Whitelist of accepted upload types. Blocks executables, HTML/SVG (stored-XSS
// vectors) and other arbitrary content — only the file kinds the app actually
// uses (avatars, documents, spreadsheets, media) are allowed through.
const ALLOWED_MIME = new Set<string>([
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'text/csv',
    'audio/mpeg', 'audio/wav', 'audio/webm',
    'video/mp4', 'video/webm',
]);

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
};

// 20MB, matching the Supabase Storage bucket's own file_size_limit so a file
// that clears multer cannot then be rejected by Storage — an upload that fails
// AFTER being accepted and buffered is the worst of both.
//
// Overridable so the VPS (no request-body ceiling of its own) can raise it
// without a code change.
export const UPLOAD_MAX_BYTES = Number(process.env.UPLOAD_MAX_BYTES) || 20 * 1024 * 1024;

export const upload = multer({
    storage: storage,
    fileFilter,
    limits: { fileSize: UPLOAD_MAX_BYTES },
});

/**
 * multer reports both an oversized file and a fileFilter rejection by
 * calling next(err) — with no `.status` set on that error, it fell straight
 * through to the app's generic error handler and came back as a 500, which
 * is wrong on two counts: an oversized/disallowed upload is a client
 * mistake (4xx), and a 500 here would trip server-error alerting for
 * something that isn't a server problem. Placed right after upload.single()
 * in the route so it only runs when that step actually errors (normal
 * uploads skip straight past it to the route's real handler).
 */
export function handleUploadError(err: unknown, _req: Request, res: Response, next: NextFunction) {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ message: 'File exceeds the maximum allowed size.' });
        }
        return res.status(400).json({ message: `File upload error: ${err.message}` });
    }
    return res.status(400).json({ message: (err as Error)?.message || 'Invalid file upload.' });
}
