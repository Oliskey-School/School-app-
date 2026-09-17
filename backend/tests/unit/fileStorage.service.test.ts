/**
 * fileStorage.service — the URL an upload hands back is what every caller
 * persists (avatar_url, logo_url, StudentDocument.url, ...) and renders in
 * a plain <img src>, which cannot carry the API's bearer token. So it must be
 * a STABLE, PERMANENT reference. 0.7.25 started returning a 1-hour signed URL
 * and composed it without the /storage/v1 prefix, so every image uploaded
 * since 2026-09-12 404'd immediately and would have 400'd an hour later
 * regardless (verified against production storage on 2026-09-17).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const ENV_KEYS = ['SUPABASE_STORAGE_ENABLED', 'SUPABASE_URL', 'SUPABASE_STORAGE_BUCKET', 'SUPABASE_SERVICE_ROLE_KEY', 'S3_ENABLED', 'S3_PUBLIC_URL_BASE', 'S3_BUCKET'];
const saved: Record<string, string | undefined> = {};

async function loadWithEnv(env: Record<string, string>) {
    for (const k of ENV_KEYS) { saved[k] = process.env[k]; delete process.env[k]; }
    Object.assign(process.env, env);
    vi.resetModules();
    return import('../../src/services/fileStorage.service');
}

describe('fileStorage.service (Supabase Storage backend)', () => {
    const fetchMock = vi.fn();
    beforeEach(() => { vi.stubGlobal('fetch', fetchMock); fetchMock.mockReset(); });
    afterEach(() => {
        vi.unstubAllGlobals();
        for (const k of ENV_KEYS) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }
    });

    const env = {
        SUPABASE_STORAGE_ENABLED: 'true',
        SUPABASE_URL: 'https://proj.supabase.co/',
        SUPABASE_STORAGE_BUCKET: 'uploads',
        SUPABASE_SERVICE_ROLE_KEY: 'service-key',
    };

    it('storeUploadedFile returns the permanent public object URL, never a token that expires', async () => {
        fetchMock.mockResolvedValueOnce({ ok: true, text: async () => '', json: async () => ({ Key: 'uploads/avatars/s/b/u.webp' }) });
        const { storeUploadedFile } = await loadWithEnv(env);

        const stored = await storeUploadedFile(Buffer.from('img'), 'image/webp', 'avatars', 's/b/u.webp');

        expect(stored.key).toBe('avatars/s/b/u.webp');
        expect(stored.publicUrl).toBe('https://proj.supabase.co/storage/v1/object/public/uploads/avatars/s/b/u.webp');
        expect(stored.publicUrl).not.toMatch(/token=|\/object\/sign\//);
        // exactly one call: the upload itself — no second round-trip to mint a signed link
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe('https://proj.supabase.co/storage/v1/object/uploads/avatars/s/b/u.webp');
        expect(init.method).toBe('POST');
        expect(init.headers['x-upsert']).toBe('true');
    });

    it('getSignedUrl keeps the /storage/v1 prefix Supabase omits from its relative signedURL', async () => {
        // Supabase answers POST /storage/v1/object/sign/<bucket>/<key> with a path
        // relative to /storage/v1 — gluing it onto the bare project URL 404s.
        fetchMock.mockResolvedValueOnce({ ok: true, text: async () => '', json: async () => ({ signedURL: '/object/sign/uploads/avatars/s/b/u.webp?token=abc' }) });
        const { getSignedUrl } = await loadWithEnv(env);

        const url = await getSignedUrl('avatars/s/b/u.webp');

        expect(url).toBe('https://proj.supabase.co/storage/v1/object/sign/uploads/avatars/s/b/u.webp?token=abc');
    });

    it('storeUploadedFile surfaces a failed upload instead of returning a URL to nothing', async () => {
        fetchMock.mockResolvedValueOnce({ ok: false, status: 403, text: async () => 'new row violates row-level security policy' });
        const { storeUploadedFile } = await loadWithEnv(env);
        await expect(storeUploadedFile(Buffer.from('img'), 'image/webp', 'avatars', 's/b/u.webp'))
            .rejects.toThrow(/Supabase Storage upload failed \(403\)/);
    });
});

describe('fileStorage.service (S3-compatible backend)', () => {
    afterEach(() => { for (const k of ENV_KEYS) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; } });

    it('refuses to upload when no permanent public base URL is configured, rather than handing out an expiring link', async () => {
        const { storeUploadedFile } = await loadWithEnv({ S3_ENABLED: 'true', S3_BUCKET: 'b' });
        await expect(storeUploadedFile(Buffer.from('img'), 'image/webp', 'avatars', 's/b/u.webp'))
            .rejects.toThrow(/S3_PUBLIC_URL_BASE/);
    });
});
