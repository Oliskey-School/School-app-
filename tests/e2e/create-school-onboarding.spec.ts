import { test, expect, Page, Response, APIRequestContext } from '@playwright/test';

/**
 * Full E2E sweep over the Create-School-Account onboarding flow.
 *
 * Verifies the full chain:
 *   Frontend wizard → POST /api/schools/onboard → school + branch + owner user persisted in DB
 *   → email-OTP verification (read from /api/debug/latest-otp) → POST /api/verification/verify
 *   → frontend auto-login → dashboard renders
 *   → independent re-login with the same credentials succeeds (proves DB persistence)
 *   → backend rejects duplicate school code (proves school code uniqueness)
 *
 * No demo data; a fresh school is created and is left in the database.
 */

interface ApiCall { url: string; status: number; method: string; }

const ts = () => Date.now().toString(36).slice(-6).toUpperCase();

async function readOtp(req: APIRequestContext, baseURL: string, email: string): Promise<string> {
    // Backend exposes /api/debug/latest-otp/:email in non-production for E2E.
    for (let attempt = 0; attempt < 20; attempt++) {
        const res = await req.get(`${baseURL}/api/debug/latest-otp/${encodeURIComponent(email)}`);
        if (res.ok()) {
            const body = await res.json();
            if (body?.otp) return body.otp;
        }
        await new Promise(r => setTimeout(r, 500));
    }
    throw new Error(`OTP for ${email} not found after 10s`);
}

test.describe.configure({ mode: 'serial' });

test('create-school onboarding wizard — frontend → backend API → database persistence', async ({ page, baseURL, request }) => {
    test.setTimeout(180_000);

    const apiCalls: ApiCall[] = [];
    const pageErrors: string[] = [];

    page.on('response', (resp: Response) => {
        const url = resp.url();
        if (!/\/api\//.test(url)) return;
        apiCalls.push({ url, status: resp.status(), method: resp.request().method() });
    });
    page.on('pageerror', err => pageErrors.push(err.message));

    // Unique-per-run identifiers so the test can run repeatedly without colliding.
    const suffix = ts();
    const schoolName = `Royal Academy ${suffix}`;
    const schoolCode = `RA${suffix}`.slice(0, 10); // 3–10 chars, uppercase
    const adminEmail = `admin.${suffix.toLowerCase()}@e2e-onboarding.test`;
    const adminPassword = 'StrongPass!9000';
    const adminName = `Owner ${suffix}`;
    const phone = '+2348000000000';
    const address = 'E2E Lane, Lagos';

    // ───────────────────────────────────────────────────────────
    // 1) Land on login → click "Create School Account"
    // ───────────────────────────────────────────────────────────
    await page.goto(baseURL!, { waitUntil: 'domcontentloaded' });
    const createBtn = page.getByRole('button', { name: /Create School Account/i });
    await createBtn.waitFor({ state: 'visible', timeout: 30_000 });
    await createBtn.click();

    // ───────────────────────────────────────────────────────────
    // 2) Step 1 — School Identity
    // ───────────────────────────────────────────────────────────
    await page.getByPlaceholder(/Royal Academy International/i).fill(schoolName);
    await page.getByPlaceholder(/EXCEL/i).fill(schoolCode);
    await page.getByPlaceholder(/\+234/).fill(phone);
    await page.getByPlaceholder(/City, State, Country/i).fill(address);

    const continueBtn = page.getByRole('button', { name: /^Continue/i });
    await continueBtn.click();

    // ───────────────────────────────────────────────────────────
    // 3) Step 2 — Admin account
    // ───────────────────────────────────────────────────────────
    await page.getByPlaceholder(/John Doe/i).fill(adminName);
    await page.getByPlaceholder(/admin@school\.com/i).fill(adminEmail);
    await page.getByPlaceholder(/Create a secure password/i).fill(adminPassword);

    // Capture the onboard call specifically
    const onboardPromise = page.waitForResponse(
        r => /\/api\/schools\/onboard$/.test(r.url()) && r.request().method() === 'POST',
        { timeout: 30_000 }
    );

    await page.getByRole('button', { name: /Create School & Send Code/i }).click();

    const onboardResp = await onboardPromise;
    expect.soft(onboardResp.status(), 'POST /api/schools/onboard should return 2xx').toBeLessThan(300);
    expect(onboardResp.status()).toBeLessThan(400);

    const onboardBody = await onboardResp.json();
    // Backend returns either { data: {...}, message } or the shape directly
    const persisted = onboardBody.data || onboardBody;

    expect(persisted, 'onboard response should carry the persisted record').toBeTruthy();
    expect(String(persisted.schoolCode || persisted.school_code || '').toUpperCase())
        .toBe(schoolCode.toUpperCase());
    expect(persisted.adminEmail || persisted.admin_email || '').toBe(adminEmail.toLowerCase());
    expect(persisted.adminUserId || persisted.admin_user_id || persisted.schoolId || persisted.school_id).toBeTruthy();

    // ───────────────────────────────────────────────────────────
    // 4) Step 3 — OTP verification
    // ───────────────────────────────────────────────────────────
    const otp = await readOtp(request, baseURL!, adminEmail);
    expect(otp).toMatch(/^\d{6}$/);

    const otpInput = page.getByPlaceholder('000000');
    await otpInput.waitFor({ state: 'visible', timeout: 15_000 });
    await otpInput.fill(otp);

    const verifyPromise = page.waitForResponse(
        r => /\/api\/verification\/verify$/.test(r.url()) && r.request().method() === 'POST',
        { timeout: 30_000 }
    );
    await page.getByRole('button', { name: /Verify & Login/i }).click();
    const verifyResp = await verifyPromise;
    expect(verifyResp.status(), 'POST /api/verification/verify should return 2xx').toBeLessThan(400);

    // After auto-login the dashboard mounts. Wait for either ADMIN_NAVIGATE or
    // a dashboard heading to appear.
    await page.waitForFunction(
        () => {
            if (typeof (window as any).ADMIN_NAVIGATE === 'function') return true;
            const heading = document.querySelector('h1, h2');
            return heading && /dashboard|overview|welcome/i.test(heading.textContent || '');
        },
        null,
        { timeout: 30_000 }
    );

    // No 5xx during the whole flow
    const fiveXX = apiCalls.filter(c => c.status >= 500);
    expect(fiveXX, '5xx errors during onboarding: ' + JSON.stringify(fiveXX)).toEqual([]);
    // No uncaught pageerrors
    expect(pageErrors.filter(e => !/ResizeObserver|HMR/.test(e)),
        'pageerrors during onboarding: ' + pageErrors.join('; ')).toEqual([]);

    // ───────────────────────────────────────────────────────────
    // 5) Database persistence proof — independent re-login with the same credentials
    // ───────────────────────────────────────────────────────────
    const loginRes = await request.post(`${baseURL}/api/auth/login`, {
        data: { email: adminEmail, password: adminPassword }
    });
    expect(loginRes.status(), 'fresh login with onboarded credentials should succeed').toBe(200);
    const loginBody = await loginRes.json();
    expect(loginBody.token, 'login should return a JWT').toBeTruthy();
    expect(loginBody.user?.email).toBe(adminEmail.toLowerCase());
    expect(String(loginBody.user?.role || '').toUpperCase()).toMatch(/ADMIN|PROPRIETOR/);
    expect(loginBody.user?.school?.code || loginBody.user?.school_code).toBe(schoolCode.toUpperCase());

    // ───────────────────────────────────────────────────────────
    // 6) School-code uniqueness — second onboarding with the same code must fail
    // ───────────────────────────────────────────────────────────
    const dupRes = await request.post(`${baseURL}/api/schools/onboard`, {
        data: {
            schoolName: 'Dup ' + schoolName,
            schoolCode,
            phone, address,
            adminName: 'Other Owner',
            adminEmail: `other.${suffix.toLowerCase()}@e2e-onboarding.test`,
            adminPassword,
            branchNames: ['Main'],
            mainBranchCode: 'MAIN',
            additionalBranches: [],
            planType: 'free'
        }
    });
    expect(dupRes.status(), 'duplicate school code must be rejected').toBeGreaterThanOrEqual(400);

    console.log(`✅ Onboarding E2E passed — school ${schoolCode} (${persisted.schoolId || persisted.school_id}) created and verified end-to-end.`);
});
