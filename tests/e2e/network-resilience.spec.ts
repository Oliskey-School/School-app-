import { test, expect, Page } from '@playwright/test';

/**
 * Degraded-network behaviour. The rule these all check is the same one: the
 * dashboard is allowed to show less, but it is never allowed to break. A failing
 * background request, a dead endpoint, a slow link or a lost connection must not
 * produce an ErrorBoundary, a blank page, or a crash.
 *
 * Each test asserts on what the user is left with, not on how the failure was
 * handled internally.
 */

const ERROR_BOUNDARY = /Dashboard Error|We encountered a critical error/i;

async function loginAsDemoAdmin(page: Page, baseURL: string) {
    await page.addInitScript(() => {
        try {
            (window as any).__AUDIT_MODE__ = true;
            localStorage.setItem('audit_mode', 'true');
        } catch { /* storage unavailable */ }
    });
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    const demo = page.getByRole('button', { name: /Try Demo School/i });
    await demo.waitFor({ state: 'visible', timeout: 30_000 });
    await demo.click();
    await page.locator('button:has-text("admin")').first().click();
    await page.waitForFunction(
        () => typeof (window as any).ADMIN_NAVIGATE === 'function',
        null,
        { timeout: 60_000 },
    );
}

/** Fails the test if the app crashed rather than degrading. */
async function expectStillUsable(page: Page, pageErrors: string[]) {
    await expect(page.locator('body')).not.toContainText(ERROR_BOUNDARY, { timeout: 5_000 });
    // The shell must still be there and still respond to navigation.
    const navigable = await page.evaluate(
        () => typeof (window as any).ADMIN_NAVIGATE === 'function',
    );
    expect(navigable, 'dashboard navigation hook disappeared — the shell did not survive').toBe(true);
    expect(pageErrors, `uncaught page errors: ${pageErrors.join(' | ')}`).toEqual([]);
}

function trackPageErrors(page: Page): string[] {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    return errors;
}

test.describe('network resilience', () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(150_000);

    test('goes offline after load and the dashboard stays usable', async ({ page, baseURL, context }) => {
        const errors = trackPageErrors(page);
        await loginAsDemoAdmin(page, baseURL!);
        // Warm a couple of screens so there is cached data to fall back on.
        await page.evaluate(() => (window as any).ADMIN_NAVIGATE('studentList', 'studentList', {}));
        await page.waitForTimeout(2500);

        await context.setOffline(true);
        try {
            await page.evaluate(() => (window as any).ADMIN_NAVIGATE('overview', 'overview', {}));
            await page.waitForTimeout(2000);
            // Returning to an already-warmed screen must still render from cache.
            await page.evaluate(() => (window as any).ADMIN_NAVIGATE('studentList', 'studentList', {}));
            await page.waitForTimeout(3000);
            await expectStillUsable(page, errors);
        } finally {
            await context.setOffline(false);
        }
    });

    test('survives a single endpoint returning 500', async ({ page, baseURL }) => {
        const errors = trackPageErrors(page);
        await loginAsDemoAdmin(page, baseURL!);

        // Break one endpoint only; everything else keeps working.
        await page.route('**/api/students**', (route) =>
            route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"induced failure"}' }),
        );

        await page.evaluate(() => (window as any).ADMIN_NAVIGATE('studentList', 'studentList', {}));
        await page.waitForTimeout(4000);
        await expectStillUsable(page, errors);

        await page.unroute('**/api/students**');
    });

    test('survives an endpoint that never responds', async ({ page, baseURL }) => {
        const errors = trackPageErrors(page);
        await loginAsDemoAdmin(page, baseURL!);

        // Hang the request rather than refusing it — a timeout path, not an error path.
        await page.route('**/api/students**', async () => { /* never fulfilled */ });

        await page.evaluate(() => (window as any).ADMIN_NAVIGATE('studentList', 'studentList', {}));
        await page.waitForTimeout(8000);
        await expectStillUsable(page, errors);

        await page.unroute('**/api/students**');
    });

    test('survives a lazy chunk failing to load', async ({ page, baseURL }) => {
        const errors = trackPageErrors(page);
        await loginAsDemoAdmin(page, baseURL!);

        // Kill one not-yet-loaded route chunk. The app installs an
        // unhandledrejection handler that force-reloads once on ChunkLoadError,
        // so the user must end up somewhere usable rather than on a blank page.
        let aborted = 0;
        await page.route('**/assets/*.js', (route) => {
            const url = route.request().url();
            if (/index-|react-vendor-/.test(url) || aborted > 0) return route.continue();
            aborted += 1;
            return route.abort('failed');
        });

        await page.evaluate(() => (window as any).ADMIN_NAVIGATE('analytics', 'analytics', {}));
        await page.waitForTimeout(6000);

        // Either the chunk retry succeeded or the app reloaded itself; either way
        // the user must not be staring at a crash screen.
        await expect(page.locator('body')).not.toContainText(ERROR_BOUNDARY, { timeout: 5_000 });
        const html = await page.content();
        expect(html.length, 'page went blank after a chunk failure').toBeGreaterThan(500);

        await page.unroute('**/assets/*.js');
    });

    test('still becomes interactive on a slow link', async ({ page, baseURL }) => {
        const errors = trackPageErrors(page);
        // ~400ms of added latency on every API call, which is what a bad mobile
        // connection looks like to this app.
        await page.route('**/api/**', async (route) => {
            await new Promise((r) => setTimeout(r, 400));
            return route.continue();
        });

        const started = Date.now();
        await loginAsDemoAdmin(page, baseURL!);
        const interactiveMs = Date.now() - started;
        console.log(`slow-link login → dashboard interactive in ${interactiveMs}ms`);

        await expectStillUsable(page, errors);
        await page.unroute('**/api/**');
    });
});
