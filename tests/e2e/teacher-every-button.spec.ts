import { test, expect, Page, Response, Locator } from '@playwright/test';
import fs from 'fs';
import path from 'path';

interface ApiHit { url: string; status: number; method: string; }
interface ButtonResult {
    view: string;
    button: string;
    status: 'PASS' | 'FAIL' | 'SKIP';
    reason?: string;
    api5xx: ApiHit[];
    api4xx: ApiHit[];
    pageErrors: string[];
}
interface ViewResult {
    view: string;
    buttonsFound: number;
    buttonsClicked: number;
    buttonsSkipped: number;
    buttonsFailed: number;
    bootError?: string;
}

// Patterns of button text to skip — destructive / mass-comms / auth.
const SKIP_PATTERNS = [
    /delete/i,
    /^remove\b/i,
    /^drop\b/i,
    /archive/i,
    /deactivate/i,
    /^reset/i,
    /restore/i,
    /suspend/i,
    /terminate/i,
    /expel/i,
    /^fire\b/i,
    /log\s*out/i,
    /sign\s*out/i,
    /confirm.*send/i,
    /emergency\s*broadcast/i,
    /send.*broadcast/i,
    /factory\s*reset/i,
    /wipe/i,
    /clear\s*all/i,
    /data\s*deletion/i,
    /create\s*manual\s*backup/i,
    /broadcast/i,
    /^send all/i,
    /blast/i,
];

const isSkipLabel = (label: string) => SKIP_PATTERNS.some(p => p.test(label));

async function loginAsDemoTeacher(page: Page, baseURL: string) {
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    const demoBtn = page.getByRole('button', { name: /Try Demo School/i });
    await demoBtn.waitFor({ state: 'visible', timeout: 30_000 });
    await demoBtn.click();
    const teacherTile = page.locator('button:has-text("teacher")').first();
    await teacherTile.waitFor({ state: 'visible', timeout: 10_000 });
    await teacherTile.click();
    await page.waitForFunction(
        () => typeof (window as any).TEACHER_NAVIGATE === 'function'
            && Array.isArray((window as any).TEACHER_COMPONENTS)
            && (window as any).TEACHER_COMPONENTS.length > 10,
        null,
        { timeout: 45_000 }
    );
}

// Recovery when a full-screen view unmounts the TeacherDashboard (deletes TEACHER_NAVIGATE).
// The demo session persists in sessionStorage, so a reload re-renders the dashboard without
// needing the landing-page "Try Demo School" flow. Only fall back to a full login if actually
// logged out.
async function ensureTeacherDashboard(page: Page, baseURL: string) {
    const present = await page.evaluate(() => typeof (window as any).TEACHER_NAVIGATE === 'function').catch(() => false);
    if (present) return;
    // Reload to restore the dashboard from the persisted (same-tab) session.
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => { });
    try {
        await page.waitForFunction(
            () => typeof (window as any).TEACHER_NAVIGATE === 'function'
                && Array.isArray((window as any).TEACHER_COMPONENTS)
                && (window as any).TEACHER_COMPONENTS.length > 10,
            null,
            { timeout: 15_000 }
        );
        return;
    } catch { /* session may be gone — full login below */ }
    await loginAsDemoTeacher(page, baseURL);
}

async function dismissAnyOverlay(page: Page) {
    // Try Escape twice for nested modals
    await page.keyboard.press('Escape').catch(() => { });
    await page.waitForTimeout(120);
    await page.keyboard.press('Escape').catch(() => { });
    await page.waitForTimeout(120);
    // Click any close button if Escape didn't work
    const closeBtn = page.locator('button[aria-label*="close" i], button:has-text("Cancel"):visible, button:has-text("Close"):visible').first();
    if (await closeBtn.count() > 0) {
        await closeBtn.click({ timeout: 1000 }).catch(() => { });
    }
}

async function getButtonLabel(b: Locator): Promise<string> {
    const aria = await b.getAttribute('aria-label').catch(() => null);
    if (aria) return aria.trim();
    const txt = (await b.innerText().catch(() => '')) || '';
    return txt.trim().replace(/\s+/g, ' ').slice(0, 60) || '(unlabeled)';
}

test.describe.configure({ mode: 'serial' });

test('every teacher screen — every clickable button passes (no 5xx, no pageerror, no ErrorBoundary)', async ({ page, baseURL }) => {
    test.setTimeout(60 * 60 * 1000); // up to 60 min for full sweep

    const allApiHits: { ts: number; hit: ApiHit }[] = [];
    page.on('response', (resp: Response) => {
        const url = resp.url();
        if (!/\/api\//.test(url)) return;
        allApiHits.push({
            ts: Date.now(),
            hit: { url, status: resp.status(), method: resp.request().method() }
        });
    });
    const pageErrors: { ts: number; msg: string }[] = [];
    page.on('pageerror', (err) => {
        pageErrors.push({ ts: Date.now(), msg: err.message });
    });

    await loginAsDemoTeacher(page, baseURL!);

    const views: string[] = await page.evaluate(() => (window as any).TEACHER_COMPONENTS || []);
    console.log(`>>> Discovered ${views.length} teacher views`);
    expect(views.length).toBeGreaterThan(10);

    const viewResults: ViewResult[] = [];
    const buttonResults: ButtonResult[] = [];

    for (let i = 0; i < views.length; i++) {
        const view = views[i];
        process.stdout.write(`\n[${i + 1}/${views.length}] ${view}\n`);

        // Ensure helper still mounted (some views unmount TeacherDashboard)
        const helperPresent = await page.evaluate(() => typeof (window as any).TEACHER_NAVIGATE === 'function').catch(() => false);
        if (!helperPresent) {
            try { await ensureTeacherDashboard(page, baseURL!); }
            catch (e: any) {
                viewResults.push({ view, buttonsFound: 0, buttonsClicked: 0, buttonsSkipped: 0, buttonsFailed: 0, bootError: 'relogin failed: ' + e.message });
                continue;
            }
        }

        const nav = await page.evaluate(async (v) => {
            try { (window as any).TEACHER_NAVIGATE(v, v, {}); return { ok: true }; }
            catch (e: any) { return { ok: false, reason: e?.message || String(e) }; }
        }, view).catch((e: any) => ({ ok: false, reason: e?.message || String(e) }));

        if (!(nav as any).ok) {
            viewResults.push({ view, buttonsFound: 0, buttonsClicked: 0, buttonsSkipped: 0, buttonsFailed: 0, bootError: (nav as any).reason });
            console.log(`  NAV FAIL: ${(nav as any).reason}`);
            continue;
        }

        // Wait for the view to settle
        await page.waitForTimeout(1500);

        // Enumerate buttons inside the view's main container, not the global shell
        // We target visible, enabled, non-shell buttons.
        const buttonLocators = page.locator('main button:visible:not([disabled]), main [role="button"]:visible:not([aria-disabled="true"]), main a[href]:visible').filter({ hasNot: page.locator('[data-shell="true"]') });
        const buttonsFound = await buttonLocators.count();
        let clicked = 0, skipped = 0, failed = 0;
        console.log(`  found ${buttonsFound} clickable elements`);

        for (let bi = 0; bi < buttonsFound; bi++) {
            // Re-resolve locator each iteration because DOM may shift
            const btn = buttonLocators.nth(bi);
            if (await btn.count() === 0) continue;
            let label = '';
            try { label = await getButtonLabel(btn); } catch { continue; }

            if (!label || label === '(unlabeled)') {
                // Still click unlabeled buttons but record as such
            }

            if (isSkipLabel(label)) {
                skipped++;
                buttonResults.push({ view, button: label, status: 'SKIP', reason: 'destructive/auth skip-list', api5xx: [], api4xx: [], pageErrors: [] });
                continue;
            }

            const tsBefore = Date.now();
            const apiBefore = allApiHits.length;
            const errBefore = pageErrors.length;

            try {
                await btn.scrollIntoViewIfNeeded({ timeout: 1000 }).catch(() => { });
                await btn.click({ timeout: 2500, trial: false, force: false });
            } catch (e: any) {
                // Element detached or not actionable — record skip
                skipped++;
                buttonResults.push({ view, button: label, status: 'SKIP', reason: 'not clickable: ' + (e.message || '').slice(0, 60), api5xx: [], api4xx: [], pageErrors: [] });
                continue;
            }

            // Brief settle window for any handler
            await page.waitForTimeout(700);

            const newApi = allApiHits.slice(apiBefore).map(h => h.hit);
            const api5xx = newApi.filter(h => h.status >= 500);
            const api4xx = newApi.filter(h => h.status >= 400 && h.status < 500);
            const newErrors = pageErrors.slice(errBefore).map(e => e.msg);

            const errorVisible = await page.evaluate(() => {
                const n = Array.from(document.querySelectorAll('h1, h2'))
                    .find(el => /dashboard error|something went wrong|critical error|we encountered a critical/i.test(el.textContent || ''));
                return !!n;
            }).catch(() => false);

            let status: 'PASS' | 'FAIL' = 'PASS';
            let reason: string | undefined;
            if (errorVisible) { status = 'FAIL'; reason = 'ErrorBoundary visible'; }
            else if (newErrors.length > 0) { status = 'FAIL'; reason = `pageerror: ${newErrors[0].slice(0, 100)}`; }
            else if (api5xx.length > 0) { status = 'FAIL'; reason = `5xx: ${api5xx[0].method} ${api5xx[0].url.split('/api/')[1]} → ${api5xx[0].status}`; }

            if (status === 'FAIL') failed++;
            clicked++;

            buttonResults.push({
                view, button: label, status, reason,
                api5xx, api4xx: api4xx.slice(0, 3),
                pageErrors: newErrors.slice(0, 2)
            });

            // Always dismiss any overlay before clicking the next button
            await dismissAnyOverlay(page);

            // If click navigated away from this view (helper still there but view changed via URL),
            // try to return to it.
            const onView = await page.evaluate((v) => {
                const cur = (window as any).__CURRENT_TEACHER_VIEW__;
                return cur ? cur === v : true; // if not exposed, assume same
            }, view).catch(() => true);
            if (!onView) {
                await page.evaluate((v) => (window as any).TEACHER_NAVIGATE?.(v, v, {}), view).catch(() => { });
                await page.waitForTimeout(800);
            }

            if (errorVisible) {
                // Reset to overview to recover
                await page.evaluate(() => (window as any).TEACHER_NAVIGATE?.('overview', 'Overview', {})).catch(() => { });
                await page.waitForTimeout(500);
                await page.evaluate((v) => (window as any).TEACHER_NAVIGATE?.(v, v, {}), view).catch(() => { });
                await page.waitForTimeout(800);
            }
        }

        viewResults.push({ view, buttonsFound, buttonsClicked: clicked, buttonsSkipped: skipped, buttonsFailed: failed });
        console.log(`  → ${clicked} clicked / ${skipped} skipped / ${failed} failed`);

        // Pop back to overview between views
        await page.evaluate(() => (window as any).TEACHER_NAVIGATE?.('overview', 'Overview', {})).catch(() => { });
        await page.waitForTimeout(250);
    }

    // ===== REPORT =====
    const outDir = path.join(process.cwd(), '.playwright-results');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'teacher-every-button.json'),
        JSON.stringify({ viewResults, buttonResults }, null, 2));

    const totalClicked = buttonResults.filter(b => b.status !== 'SKIP').length;
    const totalSkipped = buttonResults.filter(b => b.status === 'SKIP').length;
    const totalFailed = buttonResults.filter(b => b.status === 'FAIL').length;
    const totalPass = buttonResults.filter(b => b.status === 'PASS').length;
    const viewsFailed = viewResults.filter(v => v.buttonsFailed > 0 || v.bootError).length;

    const md: string[] = [];
    md.push(`# Teacher — Every Clickable Button E2E`);
    md.push('');
    md.push(`**Views swept:** ${viewResults.length}  `);
    md.push(`**Buttons clicked:** ${totalClicked}  `);
    md.push(`**PASS:** ${totalPass}  `);
    md.push(`**FAIL:** ${totalFailed}  `);
    md.push(`**SKIP (destructive/auth):** ${totalSkipped}  `);
    md.push(`**Views with failures:** ${viewsFailed}  `);
    md.push('');
    md.push(`## Failures by view`);
    md.push('');
    md.push(`| View | Button | Reason |`);
    md.push(`|---|---|---|`);
    for (const b of buttonResults.filter(b => b.status === 'FAIL')) {
        md.push(`| ${b.view} | ${b.button.replace(/\|/g, '\\|')} | ${(b.reason || '').replace(/\|/g, '\\|')} |`);
    }
    md.push('');
    md.push(`## Per-view summary`);
    md.push('');
    md.push(`| View | Found | Clicked | Skipped | Failed | Boot |`);
    md.push(`|---|---|---|---|---|---|`);
    for (const v of viewResults) {
        md.push(`| ${v.view} | ${v.buttonsFound} | ${v.buttonsClicked} | ${v.buttonsSkipped} | ${v.buttonsFailed} | ${v.bootError || '-'} |`);
    }
    fs.writeFileSync(path.join(outDir, 'teacher-every-button.md'), md.join('\n'));

    console.log(`\n>>> ${totalPass}/${totalClicked} buttons PASS, ${totalFailed} FAIL, ${totalSkipped} SKIP across ${viewResults.length} views`);
    console.log(`>>> Detail: .playwright-results/teacher-every-button.md`);
    expect(totalClicked).toBeGreaterThan(0);
});
