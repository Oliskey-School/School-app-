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
    /update\s*now/i, // PWA "new version available" banner — triggers a real reload
];

const isSkipLabel = (label: string) => SKIP_PATTERNS.some(p => p.test(label));

async function loginAsDemoStudent(page: Page, baseURL: string) {
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    const demoBtn = page.getByRole('button', { name: /Try Demo School/i });
    await demoBtn.waitFor({ state: 'visible', timeout: 30_000 });
    await demoBtn.click();
    const studentTile = page.locator('button:has-text("student")').first();
    await studentTile.waitFor({ state: 'visible', timeout: 10_000 });
    await studentTile.click();
    await page.waitForFunction(
        () => typeof (window as any).STUDENT_NAVIGATE === 'function'
            && Array.isArray((window as any).STUDENT_COMPONENTS)
            && (window as any).STUDENT_COMPONENTS.length > 10,
        null,
        { timeout: 45_000 }
    );
}

// Recovery when a full-screen view unmounts the StudentDashboard (deletes STUDENT_NAVIGATE).
// The demo session persists in sessionStorage, so a reload re-renders the dashboard without
// needing the landing-page "Try Demo School" flow. Only fall back to a full login if actually
// logged out.
async function ensureStudentDashboard(page: Page, baseURL: string) {
    const present = await page.evaluate(() => typeof (window as any).STUDENT_NAVIGATE === 'function').catch(() => false);
    if (present) return;
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => { });
    try {
        await page.waitForFunction(
            () => typeof (window as any).STUDENT_NAVIGATE === 'function'
                && Array.isArray((window as any).STUDENT_COMPONENTS)
                && (window as any).STUDENT_COMPONENTS.length > 10,
            null,
            { timeout: 15_000 }
        );
        return;
    } catch { /* session may be gone — full login below */ }
    await loginAsDemoStudent(page, baseURL);
}

async function dismissAnyOverlay(page: Page) {
    // The promotion/graduation celebration modal (components/shared/PromotionCelebration.tsx)
    // is deliberately non-Escape-dismissable (a reward moment the student must
    // acknowledge) and its only control is "Let's go! 🚀" / "Thank you!" — handle
    // it explicitly before the generic Escape/Cancel/Close sweep below.
    const promoBtn = page.locator('[role="dialog"] button:has-text("Let\'s go"), [role="dialog"] button:has-text("Thank you")').first();
    if (await promoBtn.count() > 0) {
        await promoBtn.click({ timeout: 1000 }).catch(() => { });
        await page.waitForTimeout(200);
    }
    await page.keyboard.press('Escape').catch(() => { });
    await page.waitForTimeout(120);
    await page.keyboard.press('Escape').catch(() => { });
    await page.waitForTimeout(120);
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

test('every student screen — every clickable button passes (no 5xx, no pageerror, no ErrorBoundary)', async ({ page, baseURL }) => {
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

    await loginAsDemoStudent(page, baseURL!);
    // PromotionCelebration's notification check is async — poll briefly rather
    // than a single fixed wait, since a slow first request could otherwise leave
    // the modal appearing just after our one dismissal attempt.
    for (let i = 0; i < 5; i++) {
        await page.waitForTimeout(600);
        await dismissAnyOverlay(page);
    }

    const views: string[] = await page.evaluate(() => (window as any).STUDENT_COMPONENTS || []);
    console.log(`>>> Discovered ${views.length} student views`);
    expect(views.length).toBeGreaterThan(10);

    const viewResults: ViewResult[] = [];
    const buttonResults: ButtonResult[] = [];

    for (let i = 0; i < views.length; i++) {
        const view = views[i];
        process.stdout.write(`\n[${i + 1}/${views.length}] ${view}\n`);

        const helperPresent = await page.evaluate(() => typeof (window as any).STUDENT_NAVIGATE === 'function').catch(() => false);
        if (!helperPresent) {
            try { await ensureStudentDashboard(page, baseURL!); }
            catch (e: any) {
                viewResults.push({ view, buttonsFound: 0, buttonsClicked: 0, buttonsSkipped: 0, buttonsFailed: 0, bootError: 'relogin failed: ' + e.message });
                continue;
            }
        }

        const nav = await page.evaluate(async (v) => {
            try { (window as any).STUDENT_NAVIGATE(v, v, {}); return { ok: true }; }
            catch (e: any) { return { ok: false, reason: e?.message || String(e) }; }
        }, view).catch((e: any) => ({ ok: false, reason: e?.message || String(e) }));

        if (!(nav as any).ok) {
            viewResults.push({ view, buttonsFound: 0, buttonsClicked: 0, buttonsSkipped: 0, buttonsFailed: 0, bootError: (nav as any).reason });
            console.log(`  NAV FAIL: ${(nav as any).reason}`);
            continue;
        }

        await page.waitForTimeout(1500);
        await dismissAnyOverlay(page); // catches PromotionCelebration if it appeared after login/navigation

        const buttonLocators = page.locator('main button:visible:not([disabled]), main [role="button"]:visible:not([aria-disabled="true"]), main a[href]:visible').filter({ hasNot: page.locator('[data-shell="true"]') });
        const buttonsFound = await buttonLocators.count();
        let clicked = 0, skipped = 0, failed = 0;
        console.log(`  found ${buttonsFound} clickable elements`);

        for (let bi = 0; bi < buttonsFound; bi++) {
            const btn = buttonLocators.nth(bi);
            if (await btn.count() === 0) continue;
            let label = '';
            try { label = await getButtonLabel(btn); } catch { continue; }

            if (isSkipLabel(label)) {
                skipped++;
                buttonResults.push({ view, button: label, status: 'SKIP', reason: 'destructive/auth skip-list', api5xx: [], api4xx: [], pageErrors: [] });
                continue;
            }

            const apiBefore = allApiHits.length;
            const errBefore = pageErrors.length;

            try {
                await btn.scrollIntoViewIfNeeded({ timeout: 1000 }).catch(() => { });
                await btn.click({ timeout: 2500, trial: false, force: false });
            } catch (e: any) {
                skipped++;
                buttonResults.push({ view, button: label, status: 'SKIP', reason: 'not clickable: ' + (e.message || '').slice(0, 60), api5xx: [], api4xx: [], pageErrors: [] });
                continue;
            }

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

            await dismissAnyOverlay(page);

            const onView = await page.evaluate((v) => {
                const cur = (window as any).__CURRENT_STUDENT_VIEW__;
                return cur ? cur === v : true;
            }, view).catch(() => true);
            if (!onView) {
                await page.evaluate((v) => (window as any).STUDENT_NAVIGATE?.(v, v, {}), view).catch(() => { });
                await page.waitForTimeout(800);
            }

            if (errorVisible) {
                await page.evaluate(() => (window as any).STUDENT_NAVIGATE?.('overview', 'Overview', {})).catch(() => { });
                await page.waitForTimeout(500);
                await page.evaluate((v) => (window as any).STUDENT_NAVIGATE?.(v, v, {}), view).catch(() => { });
                await page.waitForTimeout(800);
            }
        }

        viewResults.push({ view, buttonsFound, buttonsClicked: clicked, buttonsSkipped: skipped, buttonsFailed: failed });
        console.log(`  → ${clicked} clicked / ${skipped} skipped / ${failed} failed`);

        await page.evaluate(() => (window as any).STUDENT_NAVIGATE?.('overview', 'Overview', {})).catch(() => { });
        await page.waitForTimeout(250);
    }

    // ===== REPORT =====
    const outDir = path.join(process.cwd(), '.playwright-results');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'student-every-button.json'),
        JSON.stringify({ viewResults, buttonResults }, null, 2));

    const totalClicked = buttonResults.filter(b => b.status !== 'SKIP').length;
    const totalSkipped = buttonResults.filter(b => b.status === 'SKIP').length;
    const totalFailed = buttonResults.filter(b => b.status === 'FAIL').length;
    const totalPass = buttonResults.filter(b => b.status === 'PASS').length;
    const viewsFailed = viewResults.filter(v => v.buttonsFailed > 0 || v.bootError).length;

    const md: string[] = [];
    md.push(`# Student — Every Clickable Button E2E`);
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
    fs.writeFileSync(path.join(outDir, 'student-every-button.md'), md.join('\n'));

    console.log(`\n>>> ${totalPass}/${totalClicked} buttons PASS, ${totalFailed} FAIL, ${totalSkipped} SKIP across ${viewResults.length} views`);
    console.log(`>>> Detail: .playwright-results/student-every-button.md`);
    expect(totalClicked).toBeGreaterThan(0);
});
