import { test, expect, Page } from '@playwright/test';

/**
 * Publish Reports Dashboard → Report Preview.
 * Regression: the preview used to render as just a header bar over a blank area because
 * the full-screen overlay was trapped inside the dashboard. It now portals to <body>,
 * covers the viewport, and always shows content (the A4 report card OR a friendly empty
 * state) — never blank.
 */

async function loginAsDemoAdmin(page: Page, baseURL: string) {
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    const demoBtn = page.getByRole('button', { name: /Try Demo School/i });
    await demoBtn.waitFor({ state: 'visible', timeout: 30_000 });
    await demoBtn.click();
    const adminTile = page.locator('button:has-text("admin")').first();
    await adminTile.waitFor({ state: 'visible', timeout: 10_000 });
    await adminTile.click();
    await page.waitForFunction(() => typeof (window as any).ADMIN_NAVIGATE === 'function', null, { timeout: 45_000 });
}

test('report preview opens full-screen with content (not blank) and closes', async ({ page, baseURL }) => {
    test.setTimeout(120_000);
    await loginAsDemoAdmin(page, baseURL!);

    await page.evaluate(() => (window as any).ADMIN_NAVIGATE('reportCardPublishing', 'Publish Reports', {}));
    await page.waitForTimeout(2500);

    const previewBtn = page.getByRole('button', { name: 'Preview', exact: true }).first();
    await previewBtn.waitFor({ state: 'visible', timeout: 20_000 }).catch(() => {});
    test.skip(await previewBtn.count() === 0, 'Demo has no students with report cards to preview');
    await previewBtn.click();

    // The overlay is portaled to <body> and carries the header.
    const modal = page.locator('body > div.fixed.inset-0').filter({ hasText: 'Report Preview' });
    await expect(modal).toBeVisible();
    await expect(modal.getByText('Generate PDF')).toBeVisible();

    // It actually covers the viewport (portal escaped the dashboard) — top-left at 0,0.
    const box = await modal.boundingBox();
    expect(box, 'modal has no box').not.toBeNull();
    expect(box!.y, 'overlay is not at the top of the viewport (still trapped)').toBeLessThanOrEqual(12);
    expect(box!.height, 'overlay is not full height').toBeGreaterThan(500);

    // The body is NOT blank: either the A4 report card OR the empty-state message renders.
    const hasReport = await modal.locator('.printable-area').count() > 0;
    const hasEmpty = await modal.getByText(/No report data/i).count() > 0;
    const hasLoading = await modal.getByText(/Loading academic records|Preparing Report/i).count() > 0;
    expect(hasReport || hasEmpty || hasLoading, 'preview body is blank — nothing rendered').toBe(true);
    // If it was loading, give it a moment and require real content to settle in.
    if (!hasReport && !hasEmpty) {
        await page.waitForTimeout(4000);
        expect(
            (await modal.locator('.printable-area').count()) > 0 || (await modal.getByText(/No report data/i).count()) > 0,
            'preview never rendered report or empty state'
        ).toBe(true);
    }

    // The school name in the header must stay on ONE line (it used to wrap to two).
    if (await modal.locator('.printable-area').count() > 0) {
        const nameH1 = modal.locator('.printable-area h1').first();
        await expect(nameH1).toBeVisible();
        const nameBox = await nameH1.boundingBox();
        expect(nameBox, 'no school-name box').not.toBeNull();
        expect(nameBox!.height, 'school name wrapped onto multiple lines').toBeLessThan(60);
    }

    // Close via the header's X.
    await modal.locator('.sticky button').last().click();
    await expect(modal).toHaveCount(0);
});

test('report preview is responsive — the A4 sheet fits a phone screen', async ({ page, baseURL }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsDemoAdmin(page, baseURL!);

    await page.evaluate(() => (window as any).ADMIN_NAVIGATE('reportCardPublishing', 'Publish Reports', {}));
    await page.waitForTimeout(2500);
    const previewBtn = page.getByRole('button', { name: 'Preview', exact: true }).first();
    await previewBtn.waitFor({ state: 'visible', timeout: 20_000 }).catch(() => {});
    test.skip(await previewBtn.count() === 0, 'Demo has no students with report cards');
    await previewBtn.click();
    await page.waitForTimeout(2500);

    // The close (X) button must be fully on-screen on a phone — it used to overflow off the
    // right edge, leaving no way to exit the preview on mobile.
    const closeBtn = page.getByRole('button', { name: 'Close preview' });
    await expect(closeBtn).toBeVisible();
    const cbox = await closeBtn.boundingBox();
    expect(cbox, 'no close-button box').not.toBeNull();
    expect(cbox!.x, 'close button is off the left edge').toBeGreaterThanOrEqual(0);
    expect(cbox!.x + cbox!.width, 'close button overflows off the right edge of the phone').toBeLessThanOrEqual(391);

    // If the A4 report rendered, it must be SCALED to fit the phone width (not clipped).
    const sheet = page.locator('.printable-area').first();
    if (await sheet.count() > 0) {
        const box = await sheet.boundingBox();
        expect(box, 'no sheet box').not.toBeNull();
        expect(box!.width, 'A4 sheet overflows the phone screen — not responsive').toBeLessThanOrEqual(392);
        expect(box!.x, 'A4 sheet starts off-screen').toBeGreaterThanOrEqual(-2);
    }
});

test('report prints as a TRUE A4 page — the mobile on-screen scale never leaks into print', async ({ page, baseURL }) => {
    test.setTimeout(120_000);
    // Open it on a phone so the on-screen sheet is scaled DOWN…
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsDemoAdmin(page, baseURL!);
    await page.evaluate(() => (window as any).ADMIN_NAVIGATE('reportCardPublishing', 'Publish Reports', {}));
    await page.waitForTimeout(2500);
    const previewBtn = page.getByRole('button', { name: 'Preview', exact: true }).first();
    await previewBtn.waitFor({ state: 'visible', timeout: 20_000 }).catch(() => {});
    test.skip(await previewBtn.count() === 0, 'Demo has no students with report cards');
    await previewBtn.click();
    const sheet = page.locator('.printable-area').first();
    await sheet.waitFor({ state: 'visible', timeout: 15_000 });

    // On the phone screen the sheet is scaled to fit.
    const onScreen = await sheet.boundingBox();
    expect(onScreen!.width, 'sheet not scaled on phone').toBeLessThanOrEqual(392);

    // …but under PRINT media the WHOLE report must fit on a single A4 page (≈794×1123px
    // at 96dpi). A long report is shrunk-to-fit so it never spills onto a 2nd page.
    await page.emulateMedia({ media: 'print' });
    await page.waitForTimeout(300);
    const printed = await page.evaluate(() => {
        const s = document.querySelector('.printable-area') as HTMLElement | null;
        if (!s) return null;
        const r = s.getBoundingClientRect();
        return { width: r.width, height: r.height, transform: getComputedStyle(s).transform };
    });
    await page.emulateMedia({ media: 'screen' });

    expect(printed, 'no printed sheet').not.toBeNull();
    // The key requirement: it fits ONE A4 page (height ≤ ~1123px) and within A4 width.
    expect(printed!.height, 'report is taller than one A4 page — it would spill onto a 2nd page').toBeLessThanOrEqual(1130);
    expect(printed!.width, 'report is wider than an A4 page').toBeLessThanOrEqual(800);
    // …and it is a real, readable sheet (not collapsed to nothing).
    expect(printed!.width, 'printed report collapsed').toBeGreaterThan(400);
    // The on-screen mobile scale transform must be gone for print.
    expect(['none', 'matrix(1, 0, 0, 1, 0, 0)'].includes(printed!.transform), 'mobile scale leaked into print').toBe(true);
});
