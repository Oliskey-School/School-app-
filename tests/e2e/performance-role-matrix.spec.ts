import { test, expect, Page } from '@playwright/test';

const ROLES = [
    { key: 'admin', tile: 'School Admin', nav: 'ADMIN_NAVIGATE', list: 'ADMIN_COMPONENTS', home: 'overview' },
    { key: 'teacher', tile: 'Teacher', nav: 'TEACHER_NAVIGATE', list: 'TEACHER_COMPONENTS', home: 'overview' },
    { key: 'student', tile: 'Student', nav: 'STUDENT_NAVIGATE', list: 'STUDENT_COMPONENTS', home: 'overview' },
    { key: 'parent', tile: 'Parent', nav: 'PARENT_NAVIGATE', list: 'PARENT_COMPONENTS', home: 'dashboard' },
] as const;

async function login(page: Page, baseURL: string, role: typeof ROLES[number]) {
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /Try Demo School/i }).click();
    await page.getByRole('button', { name: new RegExp(role.tile, 'i') }).first().click();
    await page.waitForFunction(
        ({ nav, list }) => typeof (window as any)[nav] === 'function' && Array.isArray((window as any)[list]),
        { nav: role.nav, list: role.list },
        { timeout: 45_000 },
    );
}

function installMutationClock(page: Page) {
    return page.evaluate(() => {
        const w = window as any;
        w.__PERF_LAST_MUTATION__ = performance.now();
        w.__PERF_OBSERVER__?.disconnect?.();
        w.__PERF_OBSERVER__ = new MutationObserver(() => {
            w.__PERF_LAST_MUTATION__ = performance.now();
        });
        w.__PERF_OBSERVER__.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: false });
    });
}

test.describe('production role performance matrix', () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(20 * 60 * 1000);

    for (const role of ROLES) {
        test(`${role.key}: registered views cold/warm matrix`, async ({ page, baseURL }) => {
            const apiStarts = new Map<string, number>();
            const apiTimes = new Map<string, number[]>();
            const pageErrors: string[] = [];
            const serverErrors: string[] = [];

            page.on('request', (request) => {
                if (/\/api\//.test(request.url())) apiStarts.set(request.url() + request.method(), Date.now());
            });
            page.on('response', (response) => {
                if (!/\/api\//.test(response.url())) return;
                const key = response.url() + response.request().method();
                const started = apiStarts.get(key);
                if (started !== undefined) {
                    const times = apiTimes.get(role.key) || [];
                    times.push(Date.now() - started);
                    apiTimes.set(role.key, times);
                    apiStarts.delete(key);
                }
                if (response.status() >= 500) serverErrors.push(`${response.request().method()} ${response.url()} -> ${response.status()}`);
            });
            page.on('pageerror', (error) => pageErrors.push(error.message));

            await login(page, baseURL!, role);
            await installMutationClock(page);

            const views: string[] = await page.evaluate((list) => (window as any)[list] || [], role.list);
            expect(views.length, `${role.key} exposed no registered views`).toBeGreaterThan(0);

            const rows: Array<Record<string, unknown>> = [];
            let previousSignature = '';

            for (const view of views) {
                const nav = role.nav;
                const coldStart = Date.now();
                await page.evaluate(({ nav, view }) => (window as any)[nav]?.(view, view, {}), { nav, view });
                await page.waitForFunction(() => {
                    const w = window as any;
                    return typeof w.__PERF_LAST_MUTATION__ === 'number' && w.__PERF_LAST_MUTATION__ >= 0;
                }, null, { timeout: 10_000 });
                const coldRender = await page.evaluate((start) => performance.now() - start, coldStart);

                const signature = await page.locator('main').innerText().catch(() => '');
                const warmStart = Date.now();
                await page.evaluate(({ nav, view }) => (window as any)[nav]?.(view, view, {}), { nav, view });
                await page.waitForTimeout(0);
                const warmRender = Date.now() - warmStart;
                const api = apiTimes.get(role.key) || [];
                const apiTime = api.length ? Math.max(...api) : null;

                const resources = await page.evaluate(() => performance.getEntriesByType('resource').map((e: any) => e.name));
                const prefetchedBeforeNavigation = resources.some((name) => /\.js(?:\?|$)/.test(name) && name !== location.href);

                rows.push({
                    role: role.key,
                    view,
                    firstLoadMs: Math.round(coldRender),
                    warmLoadMs: warmRender,
                    apiTimeMs: apiTime,
                    prefetch: prefetchedBeforeNavigation ? 'observed' : 'not-observed',
                    buttons: await page.locator('main button:visible:not([disabled]), main [role="button"]:visible:not([aria-disabled="true"])').count(),
                    pageErrors: pageErrors.length,
                    fiveXX: serverErrors.length,
                    signatureChanged: signature !== previousSignature || view === views[0],
                });
                previousSignature = signature;

                expect(pageErrors, `${role.key}/${view} pageerror: ${pageErrors.join('; ')}`).toEqual([]);
                expect(serverErrors, `${role.key}/${view} API 5xx: ${serverErrors.join('; ')}`).toEqual([]);
            }

            console.table(rows);
            console.log(`PERFORMANCE_MATRIX ${JSON.stringify(rows)}`);
            await page.evaluate(() => (window as any).__PERF_OBSERVER__?.disconnect?.());
        });
    }
});
