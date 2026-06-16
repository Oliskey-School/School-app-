import { test, expect, Page } from '@playwright/test';

/**
 * Timetable EDITOR:
 *  - Subjects Palette shows the full class list but collapses past 6 chips (Senior =
 *    full list across all departments, not just the 5 core subjects).
 *  - The "Split period by department" modal shows each department's OWN subjects
 *    (Science → Physics etc., Art → Government etc.), not the same flat list.
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

async function openSss1Editor(page: Page) {
    await page.evaluate(() => (window as any).ADMIN_NAVIGATE('timetable', 'Timetable Dashboard', {}));
    await page.getByText('All Classes').waitFor({ state: 'visible', timeout: 20_000 });
    await page.waitForTimeout(1500);
    const card = page.locator('.rounded-2xl').filter({ hasText: 'SSS 1' }).first();
    await card.getByRole('button', { name: /Edit/ }).click();
    await page.getByText('Subjects Palette').waitFor({ state: 'visible', timeout: 20_000 });
    await page.waitForTimeout(1500);
}

test('editor palette collapses at 6 and shows the full senior list', async ({ page, baseURL }) => {
    test.setTimeout(120_000);
    await loginAsDemoAdmin(page, baseURL!);
    await openSss1Editor(page);

    const chips = page.locator('aside [draggable="true"]');
    expect(await chips.count()).toBeLessThanOrEqual(6);

    const showAll = page.locator('aside').getByRole('button', { name: /Show all \d+/ });
    await expect(showAll).toBeVisible();
    const n = Number((await showAll.innerText()).match(/Show all (\d+)/)?.[1] || '0');
    expect(n).toBeGreaterThan(6); // full senior list, not just the 5 core
    await showAll.click();
    await page.waitForTimeout(400);
    expect(await chips.count()).toBe(n);
    await expect(page.locator('aside [draggable="true"]', { hasText: 'Physics' })).toBeVisible();
});

test('split-by-department modal shows each department\'s own subjects', async ({ page, baseURL }) => {
    test.setTimeout(120_000);
    await loginAsDemoAdmin(page, baseURL!);
    await openSss1Editor(page);

    await page.locator('button[title="Split by department"]').first().click();
    await page.getByText('Split period by department').waitFor({ state: 'visible', timeout: 10_000 });

    const deptSelect = (dept: string) =>
        page.locator('div.rounded-xl.border.border-gray-200.p-3').filter({ hasText: dept }).locator('select').first();

    const science = await deptSelect('Science').locator('option').allInnerTexts();
    const art = await deptSelect('Art').locator('option').allInnerTexts();
    const commercial = await deptSelect('Commercial').locator('option').allInnerTexts();

    // Each department exposes its own specialism, not just the shared core.
    expect(science).toContain('Physics');
    expect(art.some(s => /Government|History|Literature/.test(s))).toBe(true);
    expect(commercial.some(s => /Accounting|Commerce|Economics/.test(s))).toBe(true);
    // And the lists genuinely differ from one another.
    expect(science.join('|')).not.toBe(art.join('|'));
});
