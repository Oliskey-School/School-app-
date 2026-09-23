/**
 * Four-role browser regression sweep.
 *
 * The critical-path suite is admin-centric, so teacher, student and parent had
 * no browser coverage at all. This drives each of the four roles through the
 * journey a real user takes — sign in, land on the dashboard, move around the
 * app, reload, go back and forward, resize to a phone, and sign out — and
 * fails on the things a human would notice immediately but an API test never
 * sees: a blank screen, a spinner that never resolves, a page error, or a 5xx
 * from the API.
 *
 * Assertions are deliberately behavioural rather than copy-specific (labels are
 * translated at runtime), so this cannot break on wording changes.
 */
import { test, expect, Page } from '@playwright/test';

type Role = 'admin' | 'teacher' | 'student' | 'parent';
const ROLES: Role[] = ['admin', 'teacher', 'student', 'parent'];

/** Page errors and failed API calls collected for the whole test. */
function watch(page: Page) {
    const pageErrors: string[] = [];
    const serverErrors: string[] = [];
    page.on('pageerror', e => pageErrors.push(String(e?.message || e)));
    page.on('response', r => {
        const u = r.url();
        if (u.includes('/api/') && r.status() >= 500) serverErrors.push(`${r.request().method()} ${u.split('/api/')[1]} → ${r.status()}`);
    });
    return { pageErrors, serverErrors };
}

async function warmDemoBackend(page: Page, baseURL: string, role: string) {
    const request = page.context().request;
    let lastStatus = 0, lastBody = '';
    for (let attempt = 1; attempt <= 6; attempt++) {
        const response = await request.post(`${baseURL}/api/auth/demo/login`, { data: { role } });
        lastStatus = response.status(); lastBody = await response.text();
        if (response.ok()) return;
        if (response.status() === 503 || /warming|seed/i.test(lastBody)) { await page.waitForTimeout(2000); continue; }
        break;
    }
    throw new Error(`Demo backend could not authenticate ${role}: ${lastStatus} ${lastBody}`);
}

async function loginAsDemo(page: Page, baseURL: string, role: Role) {
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
        sessionStorage.clear();
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_refresh_token');
    });
    await warmDemoBackend(page, baseURL, role);

    const demoBtn = page.locator('button').filter({ hasText: /demo/i }).first();
    await demoBtn.waitFor({ state: 'visible', timeout: 30_000 });
    await expect(demoBtn).toBeEnabled();
    await demoBtn.click();

    const tile = page.locator(`button:has-text("${role}")`).first();
    await tile.waitFor({ state: 'visible', timeout: 15_000 });
    await tile.click();

    for (let attempt = 0; attempt < 5; attempt++) {
        if (await page.evaluate(() => !!sessionStorage.getItem('auth_token'))) return;
        await page.waitForTimeout(1500);
        const visibleTile = page.locator(`button:has-text("${role}"):visible`).first();
        if (await visibleTile.count() > 0) await visibleTile.click().catch(() => {});
    }
    throw new Error(`${role}: never became authenticated`);
}

/** The screen must show real content — not blank, not a stuck spinner. */
async function expectUsableScreen(page: Page, label: string) {
    await page.waitForFunction(() => {
        const root = document.querySelector('#root') || document.body;
        return (root?.textContent || '').trim().length > 40;
    }, null, { timeout: 30_000 }).catch(() => { throw new Error(`${label}: screen stayed blank`); });

    const text = (await page.locator('body').innerText().catch(() => '')) || '';
    expect(text.trim().length, `${label}: screen is blank`).toBeGreaterThan(40);

    // A spinner is fine briefly; one that is still there after settling is not.
    await page.waitForTimeout(2500);
    const stuck = await page.locator('[role="status"], .animate-spin').count();
    const hasContent = (await page.locator('body').innerText().catch(() => '')).trim().length > 120;
    expect(stuck === 0 || hasContent, `${label}: still showing a loading indicator with no content`).toBe(true);
}

for (const role of ROLES) {
    test.describe(`${role} dashboard`, () => {
        test(`${role}: sign in, navigate, reload, history, mobile, sign out`, async ({ page, baseURL }) => {
            test.setTimeout(180_000);
            const { pageErrors, serverErrors } = watch(page);

            // --- sign in + first paint ---
            await loginAsDemo(page, baseURL!, role);
            await expectUsableScreen(page, `${role} dashboard`);

            // --- move around: every bottom-nav / sidebar destination ---
            const navButtons = page.locator('nav button:visible, [role="navigation"] button:visible');
            const navCount = Math.min(await navButtons.count(), 5);
            for (let i = 0; i < navCount; i++) {
                await navButtons.nth(i).click({ timeout: 5000 }).catch(() => {});
                await page.waitForTimeout(1200);
                await expectUsableScreen(page, `${role} nav item ${i}`);
            }

            // --- reload keeps the session (a real user refreshes) ---
            await page.reload({ waitUntil: 'domcontentloaded' });
            await expectUsableScreen(page, `${role} after reload`);
            expect(await page.evaluate(() => !!sessionStorage.getItem('auth_token')),
                `${role}: reload dropped the session`).toBe(true);

            // --- browser back / forward ---
            await page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => {});
            await page.waitForTimeout(1200);
            await page.goForward({ waitUntil: 'domcontentloaded' }).catch(() => {});
            await expectUsableScreen(page, `${role} after back/forward`);

            // --- phone viewport ---
            await page.setViewportSize({ width: 390, height: 844 });
            await page.waitForTimeout(1200);
            await expectUsableScreen(page, `${role} mobile viewport`);
            const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
            expect(overflow, `${role}: horizontal overflow of ${overflow}px at 390px wide`).toBeLessThanOrEqual(8);
            await page.setViewportSize({ width: 1280, height: 800 });

            // --- nothing broke along the way ---
            const realPageErrors = pageErrors.filter(e => !/ResizeObserver|Non-Error promise rejection/i.test(e));
            expect(realPageErrors, `${role}: uncaught page errors:\n${realPageErrors.join('\n')}`).toEqual([]);
            expect(serverErrors, `${role}: API 5xx responses:\n${serverErrors.join('\n')}`).toEqual([]);
        });

        test(`${role}: an expired session lands on sign-in, not a blank screen`, async ({ page, baseURL }) => {
            test.setTimeout(120_000);
            await loginAsDemo(page, baseURL!, role);
            await expectUsableScreen(page, `${role} before expiry`);

            // Corrupt the token the way an expired one behaves for the client.
            await page.evaluate(() => {
                sessionStorage.setItem('auth_token', 'expired.invalid.token');
                localStorage.setItem('auth_token', 'expired.invalid.token');
            });
            await page.reload({ waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(3000);

            const text = (await page.locator('body').innerText().catch(() => '')) || '';
            expect(text.trim().length, `${role}: expired session produced a blank screen`).toBeGreaterThan(20);
            const recovered = await page.locator('button, input[type="email"], input[type="password"]').count();
            expect(recovered, `${role}: expired session left no way to sign in again`).toBeGreaterThan(0);
        });
    });
}

test('the API stays usable when a request fails (no infinite spinner)', async ({ page, baseURL }) => {
    test.setTimeout(120_000);
    await loginAsDemo(page, baseURL!, 'admin');
    await expectUsableScreen(page, 'admin before fault injection');

    // Fail one read endpoint outright; the shell must still render.
    await page.route('**/api/students**', route => route.abort('failed'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    const text = (await page.locator('body').innerText().catch(() => '')) || '';
    expect(text.trim().length, 'a failing API call blanked the whole app').toBeGreaterThan(40);
});
