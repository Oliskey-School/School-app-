import { test, expect, APIRequestContext } from '@playwright/test';

/**
 * Storage tenant isolation: School A uploads a file; School B (a completely
 * separate school, real token, real DB rows — not a mocked scenario) must
 * never be able to retrieve its bytes, whether by reusing the URL A got
 * back, by guessing/constructing A's key, or by forging the school segment
 * of that key while authenticated as B.
 *
 * This exercises whichever storage backend is actually configured
 * (SUPABASE_STORAGE_ENABLED / S3_ENABLED / local-disk fallback) rather than
 * assuming one — see the skip logic below for what each case can and can't
 * prove given how each backend's URL is shaped.
 */

function apiBase(baseURL: string) {
    return `${baseURL}/api`;
}

interface SchoolFixture {
    email: string;
    password: string;
    token: string;
}

async function onboardSchool(request: APIRequestContext, base: string, tag: string): Promise<SchoolFixture> {
    const unique = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const email = `${tag}-${unique}@example.com`;
    const password = 'FileTenantCiPass!23';
    const res = await request.post(`${base}/schools/onboard`, {
        data: {
            schoolName: `FileTenant ${tag} ${unique}`,
            schoolCode: `${tag}${unique}`.toUpperCase().slice(0, 12),
            adminEmail: email, adminName: `${tag} Admin`, adminPassword: password,
            phone: '08000000000', address: 'CI test address', state: 'Lagos', planType: 'free',
        },
    });
    expect(res.ok(), `onboarding failed: ${await res.text()}`).toBeTruthy();

    const login = await request.post(`${base}/auth/login`, { data: { email, password } });
    expect(login.ok()).toBeTruthy();
    const { token } = await login.json();
    return { email, password, token };
}

test.describe('File storage tenant isolation', () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(60_000);

    let base: string;
    let schoolA: SchoolFixture;
    let schoolB: SchoolFixture;
    let uploadedUrl: string;

    test.beforeAll(async ({ playwright, baseURL }) => {
        base = apiBase(baseURL!);
        const ctx = await playwright.request.newContext();
        schoolA = await onboardSchool(ctx, base, 'FTA');
        schoolB = await onboardSchool(ctx, base, 'FTB');

        // A real, sharp-decodable JPEG — every uploaded image is re-encoded
        // through sharp before storage (media.controller.ts), which strips
        // anything but actual pixel data, so a text "canary" embedded in the
        // bytes wouldn't survive upload even for the legitimate owner. Tenant
        // isolation here is proven by access being refused (403/404) and the
        // URL shape never being a bare public link, not by content secrecy.
        const jpeg = Buffer.from(
            '/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAEAAQDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAB//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/ALoAfAr/2Q==',
            'base64',
        );
        const upload = await ctx.post(`${base}/media/upload`, {
            headers: { Authorization: `Bearer ${schoolA.token}` },
            multipart: { file: { name: 'a-secret.jpg', mimeType: 'image/jpeg', buffer: jpeg }, bucket: 'general' },
        });
        expect(upload.ok(), await upload.text()).toBeTruthy();
        ({ publicUrl: uploadedUrl } = await upload.json());
        await ctx.dispose();
    });

    test('School A can retrieve its own just-uploaded file', async ({ request }) => {
        if (!uploadedUrl.startsWith('/api/media/file/')) {
            test.skip(true, 'Not running the local-disk fallback — this backend hands out a provider-signed URL instead, covered by the "does not embed a permanently public URL" test below.');
        }
        const res = await request.get(`${base.replace(/\/api$/, '')}${uploadedUrl}`, {
            headers: { Authorization: `Bearer ${schoolA.token}` },
        });
        expect(res.ok(), await res.text()).toBeTruthy();
    });

    test('School B cannot retrieve School A\'s file via the same URL', async ({ request }) => {
        if (!uploadedUrl.startsWith('/api/media/file/')) {
            test.skip(true, 'Local-disk-only route; cloud-storage URLs are opaque signed links checked in the URL-shape test below.');
        }
        const res = await request.get(`${base.replace(/\/api$/, '')}${uploadedUrl}`, {
            headers: { Authorization: `Bearer ${schoolB.token}` },
        });
        expect([403, 404]).toContain(res.status());
    });

    test('School B cannot retrieve School A\'s file by forging the school-id segment of the key', async ({ request }) => {
        if (!uploadedUrl.startsWith('/api/media/file/')) {
            test.skip(true, 'Key-forging only applies to the local-disk route\'s path-based authorization.');
        }
        // uploadedUrl looks like /api/media/file/<bucket>/<schoolA-id>/<rest...>.
        // Confirm a caller cannot simply substitute their OWN school id and
        // walk into someone else's bucket/rest segments — the check must
        // compare the URL's schoolId against req.user.school_id, not just
        // check "is this a valid school id".
        const segments = uploadedUrl.replace('/api/media/file/', '').split('/');
        const [bucket, , ...rest] = segments;
        const meRes = await request.get(`${base}/auth/me`, { headers: { Authorization: `Bearer ${schoolB.token}` } });
        const me = await meRes.json();
        const forgedUrl = `/api/media/file/${bucket}/${me.school_id}/${rest.join('/')}`;
        const res = await request.get(`${base.replace(/\/api$/, '')}${forgedUrl}`, {
            headers: { Authorization: `Bearer ${schoolB.token}` },
        });
        expect([403, 404]).toContain(res.status());
    });

    test('an unauthenticated request cannot retrieve the file at all', async ({ request }) => {
        if (!uploadedUrl.startsWith('/api/media/file/')) {
            test.skip(true, 'Local-disk-only route.');
        }
        const res = await request.get(`${base.replace(/\/api$/, '')}${uploadedUrl}`);
        expect(res.status()).toBe(401);
    });

    test('the returned URL is not a permanently-public link with no authorization check', async () => {
        // Whatever backend is active, storeUploadedFile() must never hand back
        // a bare .../object/public/... Supabase URL or an unsigned S3 URL —
        // both are servable to anyone with the link, forever, regardless of
        // tenant. A signed URL (query-string token) or our own authenticated
        // route are the only two acceptable shapes.
        const isOwnRoute = uploadedUrl.startsWith('/api/media/file/');
        const isSignedProviderUrl = /[?&](token|X-Amz-Signature)=/.test(uploadedUrl);
        const isBarePublicSupabaseUrl = /\/storage\/v1\/object\/public\//.test(uploadedUrl);
        expect(isOwnRoute || isSignedProviderUrl, `unexpected URL shape: ${uploadedUrl}`).toBeTruthy();
        expect(isBarePublicSupabaseUrl, `got an unsigned public Supabase URL: ${uploadedUrl}`).toBeFalsy();
    });
});
