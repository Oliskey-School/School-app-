import { test, expect, Page } from '@playwright/test';

/**
 * Timetable Builder: canonical class columns per level + save-survives-reload.
 *  - Lower Primary shows exactly Primary 1, 2, 3 (no duplicates).
 *  - Upper Primary shows exactly Primary 4, 5, 6 (incl. the previously-missing 6).
 *  - After Generate + Save + full reload, the saved lessons re-appear.
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

async function openBuilder(page: Page) {
    await page.evaluate(() => (window as any).ADMIN_NAVIGATE('timetableBuilder', 'Timetable Builder', {}));
    await page.getByRole('button', { name: /Generate with AI/i }).waitFor({ state: 'visible', timeout: 25_000 });
    await page.waitForTimeout(1200);
}

// Class-name headers in the grid (text-sm font-bold) — returns the visible column labels.
async function columnHeaders(page: Page): Promise<string[]> {
    return page.locator('main p.text-sm.font-bold.text-slate-800').allInnerTexts();
}

test.describe.configure({ mode: 'serial' });

test('builder shows canonical Primary columns (1-3 lower, 4-6 upper)', async ({ page, baseURL }) => {
    test.setTimeout(120_000);
    await loginAsDemoAdmin(page, baseURL!);
    await openBuilder(page);

    await page.getByRole('button', { name: /^Lower Primary$/ }).click();
    await page.waitForTimeout(800);
    const lower = await columnHeaders(page);
    expect(lower.map(s => s.trim())).toEqual(['Primary 1 A', 'Primary 2 A', 'Primary 3 A']);

    await page.getByRole('button', { name: /^Upper Primary$/ }).click();
    await page.waitForTimeout(800);
    const upper = await columnHeaders(page);
    expect(upper.map(s => s.trim())).toEqual(['Primary 4 A', 'Primary 5 A', 'Primary 6 A']);
});

test('subject palette collapses to 5 and shows only the class\'s subjects', async ({ page, baseURL }) => {
    test.setTimeout(120_000);
    await loginAsDemoAdmin(page, baseURL!);
    await openBuilder(page);

    const chips = page.locator('main [draggable="true"]');

    // Senior Secondary — collapsed to at most 5 chips.
    await page.getByRole('button', { name: /^Senior Secondary$/ }).click();
    await page.waitForTimeout(600);
    expect(await chips.count()).toBeLessThanOrEqual(5);

    // Junior Secondary — was showing its full ~12 subjects; now collapsed to 5.
    await page.getByRole('button', { name: /^Junior Secondary$/ }).click();
    await page.waitForTimeout(600);
    expect(await chips.count()).toBe(5);

    // "Show all N" must reflect the CLASS's subject count (not the 64-subject catalogue).
    const showAll = page.getByRole('button', { name: /Show all \d+/ });
    await expect(showAll).toBeVisible();
    const n = Number((await showAll.innerText()).match(/Show all (\d+)/)?.[1] || '0');
    expect(n).toBeGreaterThan(5);
    expect(n).toBeLessThan(40); // a class has far fewer than the full catalogue (64)

    // Expanding shows exactly the class's subjects.
    await showAll.click();
    await page.waitForTimeout(500);
    expect(await chips.count()).toBe(n);
});

test('senior shows the full subject list and admin can add a custom subject globally', async ({ page, baseURL }) => {
    test.setTimeout(120_000);
    await loginAsDemoAdmin(page, baseURL!);
    await openBuilder(page);

    const chips = page.locator('main [draggable="true"]');

    await page.getByRole('button', { name: /^Senior Secondary$/ }).click();
    await page.waitForTimeout(600);
    expect(await chips.count()).toBeLessThanOrEqual(5); // still collapsed to 5

    // Senior now has many subjects (core + Science + Arts + Commercial), not just 5.
    const showAll = page.getByRole('button', { name: /Show all \d+/ });
    await expect(showAll).toBeVisible();
    const n = Number((await showAll.innerText()).match(/Show all (\d+)/)?.[1] || '0');
    expect(n).toBeGreaterThan(10);
    await showAll.click();
    await page.waitForTimeout(400);
    await expect(page.locator('main [draggable="true"]', { hasText: 'Physics' })).toBeVisible();

    // Add a custom subject — appears immediately as a draggable chip.
    const unique = `Robotics ${Date.now()}`;
    await page.getByPlaceholder('Add a subject…').fill(unique);
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.locator('main [draggable="true"]', { hasText: unique })).toBeVisible({ timeout: 10_000 });

    // It's global — also shows on another level.
    await page.getByRole('button', { name: /^Junior Secondary$/ }).click();
    await page.waitForTimeout(400);
    const showAllJ = page.getByRole('button', { name: /Show all \d+/ });
    if (await showAllJ.count() > 0) { await showAllJ.click(); await page.waitForTimeout(300); }
    await expect(page.locator('main [draggable="true"]', { hasText: unique })).toBeVisible();
});

test('builder grid is responsive: all classes on desktop, one at a time on mobile', async ({ page, baseURL }) => {
    test.setTimeout(120_000);
    await loginAsDemoAdmin(page, baseURL!);
    await openBuilder(page);
    await page.getByRole('button', { name: /^Senior Secondary$/ }).click();
    await page.waitForTimeout(600);

    const headers = page.locator('main p.text-sm.font-bold.text-slate-800');

    // Desktop (wide default viewport): all 3 class columns visible.
    expect(await headers.count()).toBe(3);

    // Mobile: only ONE class column + a class picker to switch.
    await page.setViewportSize({ width: 390, height: 800 });
    await page.waitForTimeout(700);
    expect(await headers.count()).toBe(1);
    await page.getByRole('button', { name: 'SSS 2 A', exact: true }).click();
    await page.waitForTimeout(400);
    await expect(headers.first()).toContainText('SSS 2');

    // Back to desktop: all three columns return.
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(700);
    expect(await headers.count()).toBe(3);
});

test('builder save survives a full reload', async ({ page, baseURL }) => {
    test.setTimeout(120_000);
    await loginAsDemoAdmin(page, baseURL!);
    await openBuilder(page);

    // Fill the active day/level and save.
    await page.getByRole('button', { name: /Generate with AI/i }).click();
    await page.waitForTimeout(800);
    await expect(page.locator('text=/[1-9]\\d* periods? set across the week/')).toBeVisible();
    await page.getByRole('button', { name: /^Save$/ }).click();
    await expect(page.locator('text=/Timetable saved|Saved \\d+/i')).toBeVisible({ timeout: 90_000 });

    // Full reload, reopen the Builder, and confirm lessons reloaded (count > 0).
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof (window as any).ADMIN_NAVIGATE === 'function', null, { timeout: 45_000 });
    await openBuilder(page);

    await expect(
        page.locator('text=/[1-9]\\d* periods? set across the week/'),
        'Builder reopened empty — saved lessons did not reload'
    ).toBeVisible({ timeout: 15_000 });
});
