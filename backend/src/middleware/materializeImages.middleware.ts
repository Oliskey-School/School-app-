import { Request, Response, NextFunction } from 'express';
import sharp from 'sharp';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { storeUploadedFile } from '../services/fileStorage.service';

/**
 * Turns inline base64 images in a request body into stored files.
 *
 * Several admin screens (add/edit teacher, student, parent, branch admin) and
 * the profile editors preview a chosen photo as a `data:image/...;base64,`
 * string, and when the real upload failed — on the serverless host any
 * request over ~4.5 MB is refused before the app sees it — the preview itself
 * was saved as the avatar. Production ended up with 874 KB base64 avatars on
 * user rows, so EVERY `/auth/me` and every teacher list carried megabytes of
 * image text and took 3–7 seconds. The screens are fixed too, but this is
 * the guarantee: no route can persist an inline image any more.
 *
 * Only the image-ish fields are touched; everything else passes through.
 */
const IMAGE_FIELDS = new Set(['avatar_url', 'avatarUrl', 'logo_url', 'logoUrl', 'photo_url', 'photoUrl', 'image_url', 'imageUrl', 'passportPhoto', 'cover_image', 'thumbnail_url']);
const DATA_URL = /^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/i;
const MAX_DECODED_BYTES = 12 * 1024 * 1024;

export async function materializeDataUrlImage(value: string, opts: { schoolId: string; owner: string }): Promise<string> {
    const m = DATA_URL.exec(value);
    if (!m) return value;
    const raw = Buffer.from(m[2].replace(/\s+/g, ''), 'base64');
    if (raw.length === 0) throw Object.assign(new Error('Image is empty'), { status: 400 });
    if (raw.length > MAX_DECODED_BYTES) throw Object.assign(new Error('Image is too large (max 12 MB)'), { status: 400 });
    // Profile-sized: never store more pixels than a screen shows. If the bytes
    // are not a decodable image, store them as sent (still out of the database)
    // rather than failing the whole save.
    let bytes = raw, mime = m[1].toLowerCase(), ext = 'webp';
    try {
        bytes = await sharp(raw).rotate().resize(1024, 1024, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
        mime = 'image/webp';
    } catch {
        ext = mime.split('/')[1]?.replace(/[^a-z0-9]/g, '') || 'bin';
    }
    const safeSchool = String(opts.schoolId || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '');
    const safeOwner = String(opts.owner || 'anon').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'anon';
    const name = `${safeOwner}-${crypto.createHash('sha1').update(bytes).digest('hex').slice(0, 10)}.${ext}`;
    const stored = await storeUploadedFile(bytes, mime, 'avatars', `${safeSchool}/${name}`);
    return stored.publicUrl;
}

async function walk(obj: any, opts: { schoolId: string; owner: string }, depth: number): Promise<void> {
    if (!obj || typeof obj !== 'object' || depth > 3) return;
    for (const key of Object.keys(obj)) {
        const v = obj[key];
        if (typeof v === 'string' && IMAGE_FIELDS.has(key) && v.startsWith('data:image/')) {
            obj[key] = await materializeDataUrlImage(v, opts);
        } else if (v && typeof v === 'object') {
            await walk(v, opts, depth + 1);
        }
    }
}

export async function materializeImages(req: Request, res: Response, next: NextFunction) {
    try {
        if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
            // Runs before the per-router `authenticate`, so read the caller's
            // school/user from the token for the storage FOLDER NAME only (an
            // unverified decode is fine for naming; the route itself still
            // authenticates and authorises the actual write).
            let user: any = (req as any).user || {};
            if (!user.school_id) {
                const h = String(req.headers.authorization || '');
                const decoded: any = h.startsWith('Bearer ') ? jwt.decode(h.slice(7)) : null;
                if (decoded && typeof decoded === 'object') user = { id: decoded.id || decoded.sub, school_id: decoded.school_id };
            }
            await walk(req.body, { schoolId: user.school_id || req.body?.school_id || '', owner: user.id || 'anon' }, 0);
        }
        next();
    } catch (err: any) {
        res.status(err?.status || 400).json({ message: err?.message || 'Invalid image' });
    }
}
