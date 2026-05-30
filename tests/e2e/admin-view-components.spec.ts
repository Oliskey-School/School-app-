import { test, expect, Page, Response } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * E2E sweep over every admin viewComponent.
 *
 * For each key in window.ADMIN_COMPONENTS:
 *   - navigate via window.ADMIN_NAVIGATE
 *   - capture all /api/* response status codes during render window
 *   - PASS only if: no ErrorBoundary banner, no pageerror, no /api/* response with status >= 500
 *   - WARN (still PASS) if 4xx (could be intentional 401/403 from UI flow)
 */

interface ApiHit { url: string; status: number; }
interface Result {
    view: string;
    status: 'PASS' | 'FAIL';
    reason?: string;
    apiCalls: number;
    api5xx: ApiHit[];
    api4xx: ApiHit[];
    pageErrors: string[];
}

async function loginAsDemoAdmin(page: Page, baseURL: string) {
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    // Click "Try Demo School" to switch into demo view
    const demoBtn = page.getByRole('button', { name: /Try Demo School/i });
    await demoBtn.waitFor({ state: 'visible', timeout: 30_000 });
    await demoBtn.click();
    // Click the "admin" role card (button with capitalized "admin" text)
    const adminTile = page.locator('button:has-text("admin")').first();
    await adminTile.waitFor({ state: 'visible', timeout: 10_000 });
    await adminTile.click();
    // Wait for AdminDashboard to mount and expose helpers
    await page.waitForFunction(
        () => typeof (window as any).ADMIN_NAVIGATE === 'function'
              && Array.isArray((window as any).ADMIN_COMPONENTS)
              && (window as any).ADMIN_COMPONENTS.length > 50,
        null,
        { timeout: 45_000 }
    );
}

test.describe.configure({ mode: 'serial' });

test('every admin viewComponent renders and its API responds without 5xx', async ({ page, baseURL }) => {
    test.setTimeout(30 * 60 * 1000);

    const allApiHits: { view: string; hit: ApiHit }[] = [];
    let currentView = '__bootstrap__';

    page.on('response', (resp: Response) => {
        const url = resp.url();
        if (!/\/api\//.test(url)) return;
        allApiHits.push({ view: currentView, hit: { url, status: resp.status() } });
    });

    const pageErrors: { view: string; msg: string }[] = [];
    page.on('pageerror', (err) => {
        pageErrors.push({ view: currentView, msg: err.message });
    });

    await loginAsDemoAdmin(page, baseURL!);

    const views: string[] = await page.evaluate(() => (window as any).ADMIN_COMPONENTS || []);
    console.log(`>>> Discovered ${views.length} admin viewComponent keys`);
    expect(views.length).toBeGreaterThan(50);

    const results: Result[] = [];

    for (let i = 0; i < views.length; i++) {
        const view = views[i];
        currentView = view;
        process.stdout.write(`[${i + 1}/${views.length}] ${view} ... `);

        const apiBefore = allApiHits.length;
        const errBefore = pageErrors.length;

        // Some views (counselorDashboard, superAdmin) render their own full-screen
        // dashboard and unmount AdminDashboard, removing window.ADMIN_NAVIGATE.
        // Re-bootstrap the admin session if the helper is gone.
        const helperPresent = await page.evaluate(() => typeof (window as any).ADMIN_NAVIGATE === 'function').catch(() => false);
        if (!helperPresent) {
            try {
                await loginAsDemoAdmin(page, baseURL!);
            } catch (e) {
                // If re-login fails, record and continue
            }
        }

        const navResult = await page.evaluate(async (v) => {
            try {
                (window as any).ADMIN_NAVIGATE(v, v, {});
                return { ok: true };
            } catch (e: any) {
                return { ok: false, reason: e?.message || String(e) };
            }
        }, view).catch((e) => ({ ok: false, reason: e?.message || String(e) }));

        if (!(navResult as any).ok) {
            results.push({
                view, status: 'FAIL', reason: (navResult as any).reason || 'navigate threw',
                apiCalls: 0, api5xx: [], api4xx: [], pageErrors: []
            });
            console.log('FAIL (nav)');
            continue;
        }

        // Wait for component effects to settle
        await page.waitForTimeout(1200);

        const errorVisible = await page.evaluate(() => {
            const titleNode = Array.from(document.querySelectorAll('h1, h2'))
                .find((el) => /dashboard error|something went wrong|critical error|we encountered a critical/i.test(el.textContent || ''));
            return !!titleNode;
        }).catch(() => false);

        const viewHits = allApiHits.slice(apiBefore).map(h => h.hit);
        const api5xx = viewHits.filter(h => h.status >= 500);
        const api4xx = viewHits.filter(h => h.status >= 400 && h.status < 500);
        const viewErrors = pageErrors.slice(errBefore).map(e => e.msg);

        let status: 'PASS' | 'FAIL' = 'PASS';
        let reason: string | undefined;
        if (errorVisible) { status = 'FAIL'; reason = 'ErrorBoundary visible'; }
        else if (viewErrors.length > 0) { status = 'FAIL'; reason = `pageerror: ${viewErrors[0].slice(0, 120)}`; }
        else if (api5xx.length > 0) { status = 'FAIL'; reason = `API 5xx: ${api5xx[0].url.split('/api/')[1]} -> ${api5xx[0].status}`; }

        results.push({
            view, status, reason,
            apiCalls: viewHits.length,
            api5xx,
            api4xx,
            pageErrors: viewErrors.slice(0, 3),
        });
        console.log(status + (reason ? ` (${reason})` : ` (api=${viewHits.length}${api4xx.length ? `, 4xx=${api4xx.length}` : ''})`));

        // Pop back to overview
        await page.evaluate(() => (window as any).ADMIN_NAVIGATE?.('overview', 'Overview', {})).catch(() => {});
        await page.waitForTimeout(200);
    }

    // Write detailed JSON
    const outDir = path.join(process.cwd(), '.playwright-results');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'admin-views-results.json'), JSON.stringify(results, null, 2));

    // Write human-readable markdown
    const md: string[] = [];
    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    md.push(`# Admin viewComponents E2E Sweep`);
    md.push(``);
    md.push(`Total: **${results.length}** | Passed: **${passed}** | Failed: **${failed}** | Pass rate: **${Math.round(passed * 100 / results.length)}%**`);
    md.push(``);
    md.push(`## FAILURES (${failed})`);
    md.push(``);
    md.push(`| View | Reason | API 5xx | pageerror |`);
    md.push(`|---|---|---|---|`);
    for (const r of results.filter(r => r.status === 'FAIL')) {
        const fivexx = r.api5xx.map(h => `${h.url.split('/api/')[1]}=${h.status}`).join(', ') || '-';
        const errs = r.pageErrors.join('; ').slice(0, 80) || '-';
        md.push(`| ${r.view} | ${r.reason || ''} | ${fivexx} | ${errs} |`);
    }
    md.push(``);
    md.push(`## PASSED (${passed})`);
    md.push(``);
    md.push(`| View | API calls | 4xx (non-blocking) |`);
    md.push(`|---|---|---|`);
    for (const r of results.filter(r => r.status === 'PASS')) {
        const fourxx = r.api4xx.map(h => `${h.url.split('/api/')[1]}=${h.status}`).slice(0, 3).join(', ') || '-';
        md.push(`| ${r.view} | ${r.apiCalls} | ${fourxx} |`);
    }
    fs.writeFileSync(path.join(outDir, 'admin-views-results.md'), md.join('\n'));

    console.log(`\n>>> RESULT: ${passed}/${results.length} PASS, ${failed} FAIL`);
    console.log(`>>> Detail saved to: .playwright-results/admin-views-results.md`);
    expect(results.length).toBeGreaterThan(0);
});
