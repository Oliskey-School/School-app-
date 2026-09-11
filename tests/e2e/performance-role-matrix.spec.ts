import { test, expect, Page } from '@playwright/test';

const ROLES = [
    { key: 'admin', tile: 'School Admin', nav: 'ADMIN_NAVIGATE', list: 'ADMIN_COMPONENTS', home: 'overview' },
    { key: 'teacher', tile: 'Teacher', nav: 'TEACHER_NAVIGATE', list: 'TEACHER_COMPONENTS', home: 'overview' },
    { key: 'student', tile: 'Student', nav: 'STUDENT_NAVIGATE', list: 'STUDENT_COMPONENTS', home: 'overview' },
    { key: 'parent', tile: 'Parent', nav: 'PARENT_NAVIGATE', list: 'PARENT_COMPONENTS', home: 'dashboard' },
] as const;

async function login(page: Page, baseURL: string, role: typeof ROLES[number]) {
    // ParentDashboard only publishes PARENT_NAVIGATE/PARENT_COMPONENTS when audit
    // mode is on — deliberately, so the navigation hook is not reachable by
    // arbitrary page script in production. Every other parent spec opts in the
    // same way (see parent-every-button.spec.ts); this one did not, which is why
    // the parent matrix timed out waiting for a hook that was never going to
    // appear. Harmless for the roles that expose theirs unconditionally.
    await page.addInitScript(() => {
        try {
            (window as any).__AUDIT_MODE__ = true;
            localStorage.setItem('audit_mode', 'true');
        } catch { /* storage unavailable — the unconditional roles still work */ }
    });
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /Try Demo School/i }).click();
    const start = Date.now();
    await page.getByRole('button', { name: new RegExp(role.tile, 'i') }).first().click();
    await page.waitForFunction(
        ({ nav, list }) => typeof (window as any)[nav] === 'function' && Array.isArray((window as any)[list]),
        { nav: role.nav, list: role.list },
        { timeout: 45_000 },
    );
    return Date.now() - start;
}

function installMutationClock(page: Page) {
    return page.evaluate(() => {
        const w = window as any;
        w.__PERF_MUTATION__ = 0;
        w.__PERF_OBSERVER__?.disconnect?.();
        w.__PERF_OBSERVER__ = new MutationObserver(() => { w.__PERF_MUTATION__ += 1; });
        w.__PERF_OBSERVER__.observe(document.body, { childList: true, subtree: true, characterData: true });
    });
}

async function measureNavigation(page: Page, role: typeof ROLES[number], view: string) {
    const before = await page.evaluate(() => (window as any).__PERF_MUTATION__ || 0);
    const start = Date.now();
    await page.evaluate(({ nav, view }) => (window as any)[nav]?.(view, view, {}), { nav: role.nav, view });
    await page.waitForFunction((previous) => ((window as any).__PERF_MUTATION__ || 0) > previous, before, { timeout: 10_000 });
    return Date.now() - start;
}

test.describe('production role performance matrix', () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(20 * 60 * 1000);

    for (const role of ROLES) {
        test(`${role.key}: registered views cold/warm matrix`, async ({ page, baseURL }) => {
            const dashboardFirstRenderMs = await login(page, baseURL!, role);
            await installMutationClock(page);

            const views: string[] = await page.evaluate((list) => (window as any)[list] || [], role.list);
            expect(views.length, `${role.key} exposed no registered views`).toBeGreaterThan(0);

            const rows: Array<Record<string, unknown>> = [];

            for (const view of views) {
                const pageErrors: string[] = [];
                const serverErrors: string[] = [];
                const apiStarts = new Map<string, number>();
                const apiTimes: number[] = [];

                const onRequest = (request: any) => {
                    if (/\/api\//.test(request.url())) apiStarts.set(request.url() + request.method(), Date.now());
                };
                const onResponse = (response: any) => {
                    if (!/\/api\//.test(response.url())) return;
                    const key = response.url() + response.request().method();
                    const started = apiStarts.get(key);
                    if (started !== undefined) {
                        apiTimes.push(Date.now() - started);
                        apiStarts.delete(key);
                    }
                    if (response.status() >= 500) serverErrors.push(`${response.request().method()} ${response.url()} -> ${response.status()}`);
                };
                const onPageError = (error: Error) => pageErrors.push(error.message);
                page.on('request', onRequest);
                page.on('response', onResponse);
                page.on('pageerror', onPageError);

                let firstLoadMs: number;
                if (view === role.home) {
                    firstLoadMs = dashboardFirstRenderMs;
                } else {
                    await measureNavigation(page, role, role.home);
                    firstLoadMs = await measureNavigation(page, role, view);
                }

                const buttons = await page.locator('main button:visible:not([disabled]), main [role="button"]:visible:not([aria-disabled="true"])').count();

                // Force a real route transition before measuring the warm return.
                const intermediate = view === role.home ? (views.find((v) => v !== role.home) || role.home) : role.home;
                if (intermediate !== view) await measureNavigation(page, role, intermediate);
                const warmLoadMs = await measureNavigation(page, role, view);

                const prefetch = await page.evaluate(() => {
                    const state = (window as any).__ROLE_PREFETCH__;
                    if (!state?.started) return 'not-started';
                    return state.completed >= state.total ? 'complete' : `in-progress:${state.completed}/${state.total}`;
                });

                rows.push({
                    role: role.key,
                    view,
                    firstLoadMs,
                    warmLoadMs,
                    apiTimeMs: apiTimes.length ? Math.max(...apiTimes) : null,
                    prefetch,
                    buttons,
                    fiveXX: serverErrors.length,
                    pageErrors: pageErrors.length,
                    result: serverErrors.length === 0 && pageErrors.length === 0 ? 'PASS' : 'FAIL',
                });

                page.off('request', onRequest);
                page.off('response', onResponse);
                page.off('pageerror', onPageError);

                expect(pageErrors, `${role.key}/${view} pageerror: ${pageErrors.join('; ')}`).toEqual([]);
                expect(serverErrors, `${role.key}/${view} API 5xx: ${serverErrors.join('; ')}`).toEqual([]);
            }

            console.table(rows);
            console.log(`PERFORMANCE_MATRIX ${JSON.stringify(rows)}`);
            await page.evaluate(() => (window as any).__PERF_OBSERVER__?.disconnect?.());
        });
    }
});
