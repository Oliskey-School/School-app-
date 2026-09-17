import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl as presignS3 } from '@aws-sdk/s3-request-presigner';

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
    key: string;
}

// How long a minted URL stays usable. Short enough that a leaked/cached link
// stops working quickly; long enough that a page load and its images don't
// race the expiry. Re-resolve via getSignedUrl() for a fresh one rather than
// holding onto an old one past this window.
const SIGNED_URL_TTL_SECONDS = 3600;

/**
 * Mints a fresh, short-lived URL for an already-stored object, given the
 * SAME `bucket`/`relativePath` (or full `key`) that storeUploadedFile used.
 * Callers must have already checked the caller is authorized for this
 * tenant's data before calling this — this function does no authorization
 * of its own, it only knows how to talk to whichever backend is active.
 */
export async function getSignedUrl(key: string): Promise<string> {
    if (SUPABASE_STORAGE_ENABLED) {
        const base = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
        const storageBucket = process.env.SUPABASE_STORAGE_BUCKET || 'uploads';
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

        const res = await fetch(`${base}/storage/v1/object/sign/${storageBucket}/${key}`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${serviceKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ expiresIn: SIGNED_URL_TTL_SECONDS }),
        });
        if (!res.ok) {
            throw new Error(`Supabase Storage sign failed (${res.status}): ${await res.text()}`);
        }
        const { signedURL } = await res.json() as { signedURL: string };
        // Supabase returns the signed path RELATIVE to /storage/v1
        // ("/object/sign/<bucket>/<key>?token=..."), so it must be joined
        // under that prefix — gluing it straight onto the project URL gives
        // https://<ref>.supabase.co/object/sign/... which is a 404 from the
        // first second, token or no token (this is what 0.7.25 shipped).
        const relative = signedURL.startsWith('/') ? signedURL : `/${signedURL}`;
        return relative.startsWith('/storage/v1/') ? `${base}${relative}` : `${base}/storage/v1${relative}`;
    }

    if (S3_ENABLED) {
        return presignS3(
            getS3Client(),
            new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }),
            { expiresIn: SIGNED_URL_TTL_SECONDS },
        );
    }

    // Local disk: there is no "signed URL" backend to ask — the authenticated
    // retrieval route (see media.routes.ts / media.controller.ts's
    // downloadFile) IS the access-control boundary, checked fresh on every
    // request rather than embedded in the URL. Same key, stable path.
    return `/api/media/file/${key}`;
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

        // The PERMANENT public object URL — deliberately not a signed one.
        //
        // Whatever this returns is what every caller persists (User.avatar_url,
        // School.logo_url, StudentDocument.url, ...) and renders in a plain
        // <img src>, which cannot attach the API's bearer token. A signed URL
        // is a 1-hour token: 0.7.25 returned one here (mis-joined, see
        // getSignedUrl) and every image uploaded after 2026-09-12 broke —
        // immediately from the bad path, and an hour later regardless. The
        // reference that gets stored must be stable; the file itself is what
        // lives forever in the bucket.
        //
        // Access control note: this URL only serves the object while the
        // SUPABASE_STORAGE_BUCKET bucket is public, which is how it is
        // configured today (verified 2026-09-17). Making uploads private is a
        // real design change — store the key, serve through an authenticated
        // proxy the browser can reach without a bearer header — not a matter
        // of which URL to hand back here; signing a public bucket's objects
        // protected nothing and broke everything.
        return { publicUrl: `${base}/storage/v1/object/public/${storageBucket}/${key}`, key };
    }

    if (S3_ENABLED) {
        // Same reasoning as above: the stored reference must not expire, so a
        // permanent public base is required. Fail before uploading rather than
        // store a file nobody will ever be able to display.
        const publicBase = (process.env.S3_PUBLIC_URL_BASE || '').replace(/\/+$/, '');
        if (!publicBase) {
            throw new Error('S3_PUBLIC_URL_BASE is not set: uploads need a permanent public URL base, not a presigned link that expires.');
        }
        await getS3Client().send(new PutObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: key,
            Body: buffer,
            ContentType: mimetype,
        }));
        return { publicUrl: `${publicBase}/${key}`, key };
    }

    // Local disk fallback — served via the authenticated /api/media/file
    // route (media.controller.ts's downloadFile), never the raw filesystem
    // path or an unauthenticated static mount.
    const destPath = path.join(process.cwd(), 'uploads', key);
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, buffer);
    return { publicUrl: `/api/media/file/${key}`, key };
}
