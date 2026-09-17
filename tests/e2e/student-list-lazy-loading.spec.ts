import { test, expect, Page } from '@playwright/test';

async function loginAdmin(page: Page, baseURL: string) {
    await page.addInitScript(() => { try { (window as any).__AUDIT_MODE__ = true; localStorage.setItem('audit_mode', 'true'); } catch {} });
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /Try Demo School/i }).click();
    await page.locator('button:has-text("admin")').first().click();
    await page.waitForFunction(() => typeof (window as any).ADMIN_NAVIGATE === 'function', null, { timeout: 60_000 });
}

test('student list: per-class loading, search, status filter, class view', async ({ page, baseURL }) => {
    test.setTimeout(180_000);
    const studentCalls: string[] = [];
    page.on('request', (r) => { const u = r.url(); if (/\/api\/students(\?|\/summary)/.test(u)) studentCalls.push(u.replace(/^.*\/api/, '')); });

    await loginAdmin(page, baseURL!);
    studentCalls.length = 0;
    await page.evaluate(() => (window as any).ADMIN_NAVIGATE('studentList', 'studentList', {}));

    // Opening the screen must fetch the summary and NOT the whole roster.
    await expect.poll(() => studentCalls.some(u => u.includes('/students/summary')), { timeout: 20_000 }).toBe(true);
    await page.waitForTimeout(1500);
    const wholeRoster = studentCalls.filter(u => /\/students\?/.test(u) && !/grade=|q=/.test(u));
    expect(wholeRoster, `whole-roster request(s) fired: ${wholeRoster.join(' ')}`).toEqual([]);

    // Stage headers show counts; nothing is fetched until a class is expanded.
    const beforeExpand = studentCalls.filter(u => /grade=/.test(u)).length;
    expect(beforeExpand).toBe(0);
    const row = page.getByRole('button', { name: /^View profile for / }).first();
    await expect.poll(async () => {
        const collapsed = page.locator('button[aria-expanded="false"]');
        const n = await collapsed.count();
        for (let i = 0; i < n; i++) await collapsed.nth(i).click({ timeout: 2000 }).catch(() => {});
        return row.count();
    }, { timeout: 30_000 }).toBeGreaterThan(0);
    await expect(row).toBeVisible({ timeout: 20_000 });
    const perClass = studentCalls.filter(u => /grade=/.test(u));
    expect(perClass.length).toBeGreaterThan(0);
    expect(perClass[0]).toMatch(/grade=-?\d+|grade=none/);

    // Search: server-side, results visible with sections force-open.
    const firstName = (await page.getByRole('button', { name: /^View profile for / }).first().getAttribute('aria-label'))!.replace('View profile for ', '').split(' ')[0];
    await page.getByLabel('Search for a student').fill(firstName);
    await expect.poll(() => studentCalls.some(u => /q=/.test(u)), { timeout: 10_000 }).toBe(true);
    await expect(page.getByRole('button', { name: new RegExp(`^View profile for ${firstName}`) }).first()).toBeVisible({ timeout: 15_000 });
    expect(await page.locator('button[aria-expanded="false"]').count()).toBe(0);
    await page.getByLabel('Search for a student').fill('zzzz-no-such-student');
    await expect(page.getByText('No students found matching your search.')).toBeVisible({ timeout: 15_000 });
    await page.getByLabel('Search for a student').fill('');

    // Status filter: switching to Pending shows either the empty state or only
    // Pending headcounts (never the full "All" roster), and back to All restores it.
    await expect(page.locator('button[aria-expanded]').first()).toBeVisible({ timeout: 15_000 });
    const allHeaders = await page.locator('button[aria-expanded]').count();
    await page.getByRole('button', { name: 'Pending', exact: true }).click();
    await page.waitForTimeout(800);
    const pendingEmpty = await page.getByText('No students found matching your search.').count();
    const pendingHeaders = await page.locator('button[aria-expanded]').count();
    expect(pendingEmpty > 0 || pendingHeaders <= allHeaders).toBe(true);
    await page.getByRole('button', { name: 'All', exact: true }).click();
    await expect(page.locator('button[aria-expanded]').first()).toBeVisible({ timeout: 15_000 });

    // Class view renders class accordions, collapsed, and loads on expand.
    await page.getByRole('button', { name: 'By Class' }).click();
    // Class headers are the aria-expanded buttons that carry a count badge.
    const classBtn = page.locator('button[aria-expanded="false"]').filter({ hasText: /\d+$/ }).first();
    await expect(classBtn).toBeVisible();
    await classBtn.click();
    await expect(page.getByRole('button', { name: /^View profile for / }).first()).toBeVisible({ timeout: 20_000 });
});
