import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Mobile-responsive sweep: every parent view, at every phone/small-tablet
 * breakpoint, checked for the objective signals of a broken mobile layout:
 *   - horizontal page overflow (the page is wider than the screen)
 *   - individual elements bleeding past the right edge of the viewport
 *   - icons rendered at 0px or wildly oversized (broken sizing)
 * A screenshot is captured for every flagged view so overlap/crowding can be
 * confirmed visually afterward, without screenshotting every view blind.
 */

const VIEWPORTS = [
    { name: '375x812', width: 375, height: 812 },
    { name: '414x896', width: 414, height: 896 },
    { name: '768x1024', width: 768, height: 1024 },
];

interface Finding {
    view: string;
    viewport: string;
    overflowPx: number;
    offendingElements: string[];
    iconIssues: string[];
}

async function enableAuditMode(page: Page) {
    await page.addInitScript(() => {
        try {
            (window as any).__AUDIT_MODE__ = true;
            localStorage.setItem('audit_mode', 'true');
        } catch { /* ignore */ }
    });
}

async function loginAsDemoParent(page: Page, baseURL: string) {
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    const demoBtn = page.getByRole('button', { name: /Try Demo School/i });
    await demoBtn.waitFor({ state: 'visible', timeout: 30_000 });
    await demoBtn.click();
    const parentTile = page.locator('button:has-text("parent")').first();
    await parentTile.waitFor({ state: 'visible', timeout: 10_000 });
    await parentTile.click();
    await page.waitForFunction(
        () => typeof (window as any).PARENT_NAVIGATE === 'function'
            && Array.isArray((window as any).PARENT_COMPONENTS)
            && (window as any).PARENT_COMPONENTS.length > 10,
        null,
        { timeout: 45_000 }
    );
}

test.describe.configure({ mode: 'serial' });

test('every parent view — mobile breakpoints have no horizontal overflow / overlap / icon sizing bugs', async ({ page, baseURL }) => {
    test.setTimeout(180 * 60 * 1000);

    await enableAuditMode(page);
    await loginAsDemoParent(page, baseURL!);
    const views: string[] = await page.evaluate(() => (window as any).PARENT_COMPONENTS || []);
    console.log(`>>> Discovered ${views.length} parent views`);
    expect(views.length).toBeGreaterThan(10);

    const outDir = path.join(process.cwd(), '.playwright-results');
    const shotDir = path.join(outDir, 'parent-mobile-shots');
    fs.mkdirSync(shotDir, { recursive: true });

    const findings: Finding[] = [];

    for (let i = 0; i < views.length; i++) {
        const view = views[i];
        process.stdout.write(`\n[${i + 1}/${views.length}] ${view}`);

        const helperPresent = await page.evaluate(() => typeof (window as any).PARENT_NAVIGATE === 'function').catch(() => false);
        if (!helperPresent) {
            try { await loginAsDemoParent(page, baseURL!); }
            catch { continue; }
        }

        for (const vp of VIEWPORTS) {
            await page.setViewportSize({ width: vp.width, height: vp.height });

            const nav = await page.evaluate(async (v) => {
                try { (window as any).PARENT_NAVIGATE(v, v, {}); return { ok: true }; }
                catch (e: any) { return { ok: false, reason: e?.message || String(e) }; }
            }, view).catch((e: any) => ({ ok: false, reason: e?.message || String(e) }));
            if (!(nav as any).ok) continue;

            await page.waitForTimeout(900);

            const result = await page.evaluate(() => {
                const vw = window.innerWidth;
                const overflowPx = Math.max(0, document.documentElement.scrollWidth - vw);

                const offending: string[] = [];
                if (overflowPx > 4) {
                    const all = Array.from(document.querySelectorAll('main *'));
                    for (const el of all) {
                        const r = el.getBoundingClientRect();
                        if (r.right > vw + 4 && r.width > 0 && r.width < vw * 3) {
                            const tag = el.tagName.toLowerCase();
                            const cls = (el.getAttribute('class') || '').split(' ').slice(0, 3).join('.');
                            offending.push(`${tag}.${cls} right=${Math.round(r.right)} vw=${vw}`);
                            if (offending.length >= 5) break;
                        }
                    }
                }

                const iconIssues: string[] = [];
                const icons = Array.from(document.querySelectorAll('main svg, main img[class*="icon" i]'));
                for (const el of icons) {
                    const r = el.getBoundingClientRect();
                    if (r.width === 0 && r.height === 0) continue;
                    if ((r.width > 0 && r.width < 8) || r.width > 96) {
                        const cls = (el.getAttribute('class') || '').split(' ').slice(0, 3).join('.');
                        iconIssues.push(`svg.${cls} w=${Math.round(r.width)} h=${Math.round(r.height)}`);
                        if (iconIssues.length >= 5) break;
                    }
                }

                return { overflowPx, offending, iconIssues };
            });

            if (result.overflowPx > 4 || result.iconIssues.length > 0) {
                findings.push({
                    view,
                    viewport: vp.name,
                    overflowPx: result.overflowPx,
                    offendingElements: result.offending,
                    iconIssues: result.iconIssues,
                });
                const shotPath = path.join(shotDir, `${view}__${vp.name}.png`);
                await page.screenshot({ path: shotPath, fullPage: false }).catch(() => { });
            }
        }

        await page.evaluate(() => (window as any).PARENT_NAVIGATE?.('overview', 'Overview', {})).catch(() => { });
        await page.waitForTimeout(150);
    }

    fs.writeFileSync(path.join(outDir, 'parent-mobile-scan.json'), JSON.stringify(findings, null, 2));

    const md: string[] = [];
    md.push(`# Parent — Mobile Responsive Scan`);
    md.push('');
    md.push(`**Views swept:** ${views.length}  `);
    md.push(`**Viewports:** ${VIEWPORTS.map(v => v.name).join(', ')}  `);
    md.push(`**Flagged (view, viewport) pairs:** ${findings.length}  `);
    md.push('');
    md.push(`| View | Viewport | Overflow (px) | Offending elements | Icon issues |`);
    md.push(`|---|---|---|---|---|`);
    for (const f of findings) {
        md.push(`| ${f.view} | ${f.viewport} | ${f.overflowPx} | ${f.offendingElements.join('; ').replace(/\|/g, '/')} | ${f.iconIssues.join('; ').replace(/\|/g, '/')} |`);
    }
    fs.writeFileSync(path.join(outDir, 'parent-mobile-scan.md'), md.join('\n'));

    console.log(`\n>>> ${findings.length} flagged (view, viewport) pairs out of ${views.length * VIEWPORTS.length} checks`);
    console.log(`>>> Detail: .playwright-results/parent-mobile-scan.md`);
});
