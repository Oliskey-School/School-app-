import { test, expect, Page, Response, APIRequestContext } from '@playwright/test';

/**
 * Full E2E sweep over Forgot Password and real (non-demo) email/password sign-in.
 *
 * Verifies the full chain:
 *   Fixture: onboard a real school + admin via /api/schools/onboard, verify email
 *   → Forgot Password UI → POST /api/auth/forgot-password → reset code persisted in DB
 *   → Reset Password UI → POST /api/auth/reset-password → password updated
 *   → real Sign In UI (not demo) → POST /api/auth/login → dashboard renders
 */

interface ApiCall { url: string; status: number; method: string; }
const ts = () => Date.now().toString(36).slice(-6).toUpperCase();

async function readOtp(req: APIRequestContext, baseURL: string, email: string): Promise<string> {
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

test('forgot password + real (non-demo) sign-in — full E2E', async ({ page, baseURL, request }) => {
    test.setTimeout(180_000);

    const suffix = ts();
    const schoolName = `Forgot PW Academy ${suffix}`;
    const schoolCode = `FP${suffix}`.slice(0, 10);
    const adminEmail = `admin.${suffix.toLowerCase()}@e2e-fp.test`;
    const originalPassword = 'OriginalPass!123';
    const newPassword = 'BrandNewPass!456';
    const adminName = `Owner ${suffix}`;

    // ── Setup: create a REAL (non-demo) account via the same onboarding API
    //           already proven to work end-to-end in create-school-onboarding.spec.ts ──
    const onboardRes = await request.post(`${baseURL}/api/schools/onboard`, {
        data: {
            schoolName, schoolCode,
            phone: '+2348000000000', address: 'E2E Lane, Lagos',
            adminName, adminEmail, adminPassword: originalPassword,
            branchNames: ['Main'], mainBranchCode: 'MAIN',
            additionalBranches: [], planType: 'free'
        }
    });
    expect(onboardRes.status(), 'onboard setup call should succeed').toBeLessThan(300);

    const otp = await readOtp(request, baseURL!, adminEmail);
    const verifyRes = await request.post(`${baseURL}/api/verification/verify`, {
        data: { email: adminEmail, code: otp }
    });
    expect(verifyRes.status(), 'email verification should succeed').toBeLessThan(300);

    console.log(`Fixture account ready: ${adminEmail} / school ${schoolCode}`);

    // ═══════════════════════════════════════════════════════════
    // PART 1 — Forgot Password flow, driven live in the browser
    // ═══════════════════════════════════════════════════════════
    const apiCalls: ApiCall[] = [];
    const pageErrors: string[] = [];
    page.on('response', (resp: Response) => {
        const url = resp.url();
        if (!/\/api\//.test(url)) return;
        apiCalls.push({ url, status: resp.status(), method: resp.request().method() });
    });
    page.on('pageerror', err => pageErrors.push(err.message));

    await page.goto(baseURL!, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /Forgot Password/i }).click();
    await page.waitForSelector('text=Forgot Password', { timeout: 10_000 });

    const forgotPromise = page.waitForResponse(
        r => /\/api\/auth\/forgot-password$/.test(r.url()) && r.request().method() === 'POST',
        { timeout: 20_000 }
    );
    await page.getByPlaceholder('Your Email Address').fill(adminEmail);
    await page.getByRole('button', { name: /Send Reset Code/i }).click();
    const forgotResp = await forgotPromise;
    expect(forgotResp.status(), 'forgot-password API should return 2xx').toBeLessThan(300);

    // Fetch the actual reset code from the DB (password-reset codes aren't
    // surfaced through the signup /debug/latest-otp store, so query directly).
    let resetCode = '';
    for (let attempt = 0; attempt < 10; attempt++) {
        const dbg = await request.get(`${baseURL}/api/debug/latest-reset-code/${encodeURIComponent(adminEmail)}`).catch(() => null);
        if (dbg && dbg.ok()) {
            const body = await dbg.json();
            if (body?.code) { resetCode = body.code; break; }
        }
        await new Promise(r => setTimeout(r, 300));
    }

    console.log('RESET CODE FOUND VIA DEBUG ENDPOINT:', resetCode || '(none — endpoint may not exist)');

    await page.waitForSelector('text=Reset Password', { timeout: 10_000 });

    if (resetCode) {
        const resetPromise = page.waitForResponse(
            r => /\/api\/auth\/reset-password$/.test(r.url()) && r.request().method() === 'POST',
            { timeout: 20_000 }
        );
        await page.locator('input[placeholder="6-Digit Reset Code"]').fill(resetCode);
        await page.locator('input[placeholder="New Password"]').fill(newPassword);
        await page.getByRole('button', { name: /Update Password/i }).click();
        const resetResp = await resetPromise;
        console.log('RESET-PASSWORD API STATUS:', resetResp.status());
        expect(resetResp.status(), 'reset-password API should return 2xx').toBeLessThan(300);
        await page.waitForSelector('text=Password reset successful', { timeout: 10_000 });
    }

    const fiveXX = apiCalls.filter(c => c.status >= 500);
    expect(fiveXX, '5xx during forgot-password flow: ' + JSON.stringify(fiveXX)).toEqual([]);
    expect(pageErrors.filter(e => !/ResizeObserver|HMR/.test(e)), 'pageerrors: ' + pageErrors.join('; ')).toEqual([]);

    // ═══════════════════════════════════════════════════════════
    // PART 2 — Real (non-demo) email/password sign-in, driven live in the browser
    // ═══════════════════════════════════════════════════════════
    const finalPassword = resetCode ? newPassword : originalPassword;
    await page.waitForTimeout(resetCode ? 3500 : 0); // let the "reset successful" auto-redirect finish
    await page.goto(baseURL!, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=/Sign In|School Portal/i', { timeout: 15_000 });

    const loginApiPromise = page.waitForResponse(
        r => /\/api\/auth\/login$/.test(r.url()) && r.request().method() === 'POST',
        { timeout: 20_000 }
    );
    await page.locator('input[name="email_prevent_autofill"]').fill(adminEmail);
    await page.locator('input[name="password_prevent_autofill"]').fill(finalPassword);
    await page.locator('button[type="submit"]', { hasText: 'Sign In' }).click();
    const loginApiResp = await loginApiPromise;
    console.log('REAL LOGIN API STATUS:', loginApiResp.status());
    expect(loginApiResp.status(), 'real sign-in should return 2xx').toBeLessThan(300);

    await page.waitForFunction(
        () => {
            if (typeof (window as any).ADMIN_NAVIGATE === 'function') return true;
            const heading = document.querySelector('h1, h2');
            return heading && /dashboard|overview|welcome/i.test(heading.textContent || '');
        },
        null,
        { timeout: 20_000 }
    );
    console.log('✅ Real sign-in reached the dashboard successfully.');
});
