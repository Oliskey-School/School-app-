import multer from 'multer';

// Buffered in memory instead of written straight to local disk: the
// controller (media.controller.ts) decides where the buffer actually goes —
// object storage (S3-compatible) when configured, local disk as a fallback
// otherwise. A single storage engine can't serve both, and the destination
// is a deploy-time config choice, not something multer itself should decide.
// 50MB cap below keeps the in-memory buffer bounded.
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

export const upload = multer({
    storage: storage,
    fileFilter,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});
