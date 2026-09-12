import { test, expect, APIRequestContext } from '@playwright/test';

/**
 * File upload hardening — backend/src/controllers/media.controller.ts and
 * backend/src/utils/fileSignature.ts. Every case here sends a real multipart
 * request at the real /api/media/upload endpoint; none of it mocks the
 * verification logic. A single fresh school/admin is enough since these
 * tests are about content/type handling, not tenant isolation (that's
 * file-tenant-isolation.spec.ts).
 */

function apiBase(baseURL: string) {
    return `${baseURL}/api`;
}

// A genuine, sharp-decodable 2x2 PNG (not just the magic bytes) — needed
// anywhere a test expects to get PAST signature verification into the
// re-encode step, so the test actually exercises what it claims to.
const REAL_PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAE0lEQVQImWP4z8DwnwGM/zMwAAAf7gP9qS/A4gAAAABJRU5ErkJggg==',
    'base64',
);
const REAL_JPEG = Buffer.from(
    '/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAEAAQDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAB//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/ALoAfAr/2Q==',
    'base64',
);

interface Fixture {
    base: string;
    token: string;
}

async function buildFixture(request: APIRequestContext, baseURL: string): Promise<Fixture> {
    const base = apiBase(baseURL);
    const unique = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const adminEmail = `mu-admin-${unique}@example.com`;
    const adminPassword = 'MalUploadPass!23';

    const onboard = await request.post(`${base}/schools/onboard`, {
        data: {
            schoolName: `MalUpload CI ${unique}`,
            schoolCode: `MU${unique}`.toUpperCase().slice(0, 12),
            adminEmail, adminName: 'MalUpload Admin', adminPassword,
            phone: '08000000000', address: 'CI test address', state: 'Lagos', planType: 'free',
        },
    });
    expect(onboard.ok(), `onboarding failed: ${await onboard.text()}`).toBeTruthy();

    const login = await request.post(`${base}/auth/login`, { data: { email: adminEmail, password: adminPassword } });
    expect(login.ok()).toBeTruthy();
    const { token } = await login.json();
    return { base, token };
}

test.describe('Malicious upload rejection', () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(60_000);
    let fx: Fixture;

    test.beforeAll(async ({ playwright, baseURL }) => {
        const ctx = await playwright.request.newContext();
        fx = await buildFixture(ctx, baseURL!);
        await ctx.dispose();
    });

    test('an executable renamed as a .jpg with a spoofed image/jpeg Content-Type is rejected', async ({ request }) => {
        // Windows PE "MZ" header — a real executable's actual first bytes.
        const buffer = Buffer.concat([Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]), Buffer.alloc(256, 0x41)]);
        const res = await request.post(`${fx.base}/media/upload`, {
            headers: { Authorization: `Bearer ${fx.token}` },
            multipart: { file: { name: 'photo.jpg', mimeType: 'image/jpeg', buffer } },
        });
        expect(res.status(), await res.text()).toBe(415);
    });

    test('a shell script disguised as a PDF is rejected', async ({ request }) => {
        const buffer = Buffer.from('#!/bin/sh\nrm -rf /\n');
        const res = await request.post(`${fx.base}/media/upload`, {
            headers: { Authorization: `Bearer ${fx.token}` },
            multipart: { file: { name: 'report.pdf', mimeType: 'application/pdf', buffer } },
        });
        expect(res.status(), await res.text()).toBe(415);
    });

    test('HTML/SVG containing an embedded <script> is rejected regardless of claimed type', async ({ request }) => {
        const svg = '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"><script>alert(document.cookie)</script></svg>';
        const res = await request.post(`${fx.base}/media/upload`, {
            headers: { Authorization: `Bearer ${fx.token}` },
            multipart: { file: { name: 'image.png', mimeType: 'image/png', buffer: Buffer.from(svg) } },
        });
        expect(res.status(), await res.text()).toBe(415);
    });

    test('a genuine PNG claimed as a PDF (extension/type mismatch) is rejected', async ({ request }) => {
        const pngMagic = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Array(64).fill(0)]);
        const res = await request.post(`${fx.base}/media/upload`, {
            headers: { Authorization: `Bearer ${fx.token}` },
            multipart: { file: { name: 'doc.pdf', mimeType: 'application/pdf', buffer: pngMagic } },
        });
        expect(res.status(), await res.text()).toBe(415);
    });

    test('path traversal in the caller-supplied folder path cannot escape the tenant prefix', async ({ request }) => {
        const me = await request.get(`${fx.base}/auth/me`, { headers: { Authorization: `Bearer ${fx.token}` } });
        const { school_id: schoolId } = await me.json();

        const res = await request.post(`${fx.base}/media/upload`, {
            headers: { Authorization: `Bearer ${fx.token}` },
            multipart: {
                file: { name: 'x.png', mimeType: 'image/png', buffer: REAL_PNG },
                path: '../../../../etc/passwd-lookalike',
                bucket: 'general',
            },
        });
        expect(res.ok(), await res.text()).toBeTruthy();
        const { publicUrl } = await res.json();
        // '..' must never survive into the stored key/path at all.
        expect(publicUrl).not.toContain('..');
        // The literal word "etc" surviving as an ordinary folder NAME is
        // harmless — what would be a real escape is the resulting path
        // landing OUTSIDE the caller's own school prefix. Every key this app
        // ever hands back is force-prefixed with the uploader's own school
        // id (media.controller.ts), so confirm that's still true here.
        expect(publicUrl).toContain(`/general/${schoolId}/`);
    });

    test('an oversized file is rejected by the body-size limit', async ({ request }) => {
        // Slightly over the 20MB default cap — big enough to matter, small
        // enough to not make CI slow.
        const buffer = Buffer.alloc(21 * 1024 * 1024, 0x00);
        const res = await request.post(`${fx.base}/media/upload`, {
            headers: { Authorization: `Bearer ${fx.token}` },
            multipart: { file: { name: 'big.bin', mimeType: 'image/png', buffer } },
        });
        expect(res.status()).toBe(413);
    });

    test('a decompression-bomb-shaped PNG (huge declared dimensions) is rejected rather than exhausting memory', async ({ request }) => {
        // A minimal valid PNG signature + IHDR chunk declaring an enormous
        // canvas (60000x60000) with almost no compressed data behind it —
        // sharp's limitInputPixels must refuse this at decode time.
        const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
        const ihdrData = Buffer.alloc(13);
        ihdrData.writeUInt32BE(60000, 0); // width
        ihdrData.writeUInt32BE(60000, 4); // height
        ihdrData[8] = 8; // bit depth
        ihdrData[9] = 6; // color type (RGBA)
        const ihdrType = Buffer.from('IHDR');
        const crcBuf = Buffer.alloc(4); // CRC correctness doesn't matter — sharp still reads IHDR's declared size before validating CRC
        const ihdrLen = Buffer.alloc(4);
        ihdrLen.writeUInt32BE(13, 0);
        const bomb = Buffer.concat([sig, ihdrLen, ihdrType, ihdrData, crcBuf]);

        const res = await request.post(`${fx.base}/media/upload`, {
            headers: { Authorization: `Bearer ${fx.token}` },
            multipart: { file: { name: 'bomb.png', mimeType: 'image/png', buffer: bomb } },
        });
        // Either the signature check or sharp's limitInputPixels must refuse
        // this — never a 200 with a stored file, and never a hang/crash.
        expect([400, 415, 500]).toContain(res.status());
    });

    test('a claimed-safe MIME type outside the fixed signature allowlist is rejected, not accepted unverified', async ({ request }) => {
        // upload.middleware.ts's ALLOWED_MIME rejects unknown MIME strings
        // outright at the multer layer, before the controller/signature check
        // ever runs — confirm that boundary too.
        const res = await request.post(`${fx.base}/media/upload`, {
            headers: { Authorization: `Bearer ${fx.token}` },
            multipart: { file: { name: 'x.exe', mimeType: 'application/x-msdownload', buffer: Buffer.alloc(64) } },
        });
        expect([400, 415]).toContain(res.status());
    });

    test('a legitimate JPEG upload succeeds and is served back with safe headers', async ({ request }) => {
        const res = await request.post(`${fx.base}/media/upload`, {
            headers: { Authorization: `Bearer ${fx.token}` },
            multipart: { file: { name: 'me.jpg', mimeType: 'image/jpeg', buffer: REAL_JPEG } },
        });
        expect(res.ok(), await res.text()).toBeTruthy();
        const { publicUrl } = await res.json();
        expect(publicUrl).toBeTruthy();

        // Only meaningful against the local-disk fallback's own route — cloud
        // storage (Supabase/S3) signs its own URL and is fetched directly
        // from the provider, not through this app's routing.
        if (typeof publicUrl === 'string' && publicUrl.startsWith('/api/media/file/')) {
            const dl = await request.get(`${fx.base.replace(/\/api$/, '')}${publicUrl}`, {
                headers: { Authorization: `Bearer ${fx.token}` },
            });
            expect(dl.ok(), await dl.text()).toBeTruthy();
            expect(dl.headers()['x-content-type-options']).toBe('nosniff');
        }
    });
});
