import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

/**
 * Where uploaded files actually live. Local disk works fine on today's
 * single persistent VPS, but breaks the moment the app ever runs as more
 * than one instance (each has its own disk) or moves to any host where the
 * filesystem isn't guaranteed to survive a redeploy — object storage is the
 * production-safe default; local disk is a fallback for dev, or for a
 * deployment that hasn't configured S3_* yet.
 */
const S3_ENABLED = process.env.S3_ENABLED === 'true';

/**
 * Supabase Storage over its REST API, authenticated with the service_role key.
 *
 * Preferred over the S3 branch below when running on Vercel. Supabase Storage
 * IS S3-compatible, but its S3 access keys can only be minted from the
 * dashboard — the Management API has no endpoint for them
 * (/v1/projects/{ref}/storage/credentials returns 404), so the S3 route cannot
 * be provisioned automatically. The REST API takes the service_role key, which
 * can be, so this needs no manual step.
 *
 * The local-disk fallback below cannot be used on Vercel at all: the filesystem
 * is ephemeral per invocation, so an uploaded file disappears as soon as the
 * request that wrote it ends.
 */
const SUPABASE_STORAGE_ENABLED = process.env.SUPABASE_STORAGE_ENABLED === 'true';

let s3Client: S3Client | null = null;
function getS3Client(): S3Client {
    if (!s3Client) {
        s3Client = new S3Client({
            region: process.env.S3_REGION || 'auto',
            // Leave unset for real AWS S3; set to the provider's endpoint for
            // any other S3-compatible service (Cloudflare R2, Backblaze B2,
            // DigitalOcean Spaces, Contabo Object Storage, MinIO, ...).
            endpoint: process.env.S3_ENDPOINT || undefined,
            credentials: {
                accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
                secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
            },
            // Several non-AWS S3-compatible providers require path-style
            // requests (bucket.example.com/key doesn't resolve for them).
            forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
        });
    }
    return s3Client;
}

export interface StoredFile {
    publicUrl: string;
}

/**
 * Persists an uploaded file buffer under `<bucket>/<relativePath>` and
 * returns the URL to store/display for it. Callers should already have
 * sanitized relativePath (no `..`) before calling this.
 */
export async function storeUploadedFile(
    buffer: Buffer,
    mimetype: string,
    bucket: string,
    relativePath: string,
): Promise<StoredFile> {
    const key = `${bucket}/${relativePath}`.replace(/^\/+/, '');

    if (SUPABASE_STORAGE_ENABLED) {
        const base = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
        const storageBucket = process.env.SUPABASE_STORAGE_BUCKET || 'uploads';
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

        const res = await fetch(`${base}/storage/v1/object/${storageBucket}/${key}`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${serviceKey}`,
                'Content-Type': mimetype,
                // Re-uploading the same path (e.g. replacing a profile photo)
                // must overwrite rather than fail with "Duplicate".
                'x-upsert': 'true',
            },
            body: new Uint8Array(buffer),
        });

        if (!res.ok) {
            // Surface the reason — a silent failure here means a photo the user
            // believes they saved is simply gone.
            throw new Error(
                `Supabase Storage upload failed (${res.status}): ${await res.text()}`,
            );
        }

        return { publicUrl: `${base}/storage/v1/object/public/${storageBucket}/${key}` };
    }

    if (S3_ENABLED) {
        await getS3Client().send(new PutObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: key,
            Body: buffer,
            ContentType: mimetype,
        }));
        const base = (process.env.S3_PUBLIC_URL_BASE || '').replace(/\/+$/, '');
        return { publicUrl: `${base}/${key}` };
    }

    // Local disk fallback — served same-origin via app.ts's /uploads static mount.
    const destPath = path.join(process.cwd(), 'uploads', key);
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, buffer);
    return { publicUrl: `/uploads/${key}` };
}
