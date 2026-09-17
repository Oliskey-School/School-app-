import { test, expect, Page } from '@playwright/test';

// Serial: each role's demo login seeds its own sandbox; running several at
// once contends on the backend and stalls the login.
test.describe.configure({ mode: 'serial' });

/**
 * Low Data Mode: the settings switch persists per device, avatars in rosters
 * defer until tapped, and no realtime socket is opened while it is on.
 */
async function loginAdmin(page: Page, baseURL: string) {
    await page.addInitScript(() => { try { (window as any).__AUDIT_MODE__ = true; localStorage.setItem('audit_mode', 'true'); } catch {} });
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /Try Demo School/i }).click();
    await page.locator('button:has-text("admin")').first().click();
    await page.waitForFunction(() => typeof (window as any).ADMIN_NAVIGATE === 'function', null, { timeout: 60_000 });
}

test('switch lives in Settings > Data Usage and persists', async ({ page, baseURL }) => {
    test.setTimeout(120_000);
    await loginAdmin(page, baseURL!);
    await page.evaluate(() => (window as any).ADMIN_NAVIGATE('profileSettings', 'Profile Settings', {}));
    await page.getByRole('button', { name: /Data Usage/ }).first().click();
    const sw = page.getByRole('switch', { name: 'Low data mode' });
    await expect(sw).toBeVisible({ timeout: 15_000 });
    await expect(sw).toHaveAttribute('aria-checked', 'false');
    await sw.click();
    await expect(sw).toHaveAttribute('aria-checked', 'true');
    expect(await page.evaluate(() => localStorage.getItem('oliskey:low_data_mode'))).toBe('1');
    await sw.click();
    await expect(sw).toHaveAttribute('aria-checked', 'false');
});

test('with the mode on: avatars defer until tapped and no socket is opened', async ({ page, baseURL }) => {
    test.setTimeout(150_000);
    const imageRequests: string[] = [];
    let socketAttempts = 0;
    page.on('request', (r) => {
        const u = r.url();
        if (/ui-avatars\.com|dicebear\.com|\/uploads\/|\/api\/media\/file\//.test(u)) imageRequests.push(u);
        if (/socket\.io\//.test(u)) socketAttempts += 1; // long-polling transport
    });
    page.on('websocket', (ws) => { if (/socket.io/.test(ws.url())) socketAttempts += 1; }); // websocket transport (ignore Vite HMR)
    await page.addInitScript(() => localStorage.setItem('oliskey:low_data_mode', '1'));
    await loginAdmin(page, baseURL!);
    await page.waitForTimeout(3000);
    expect(socketAttempts, 'a realtime socket was opened despite Low Data Mode').toBe(0);

    await page.evaluate(() => (window as any).ADMIN_NAVIGATE('studentList', 'studentList', {}));
    const avatarFetchesBeforeRoster = imageRequests.length;
    // Expand until a roster row is visible.
    const row = page.getByRole('button', { name: /^View profile for / }).first();
    await expect.poll(async () => {
        const collapsed = page.locator('button[aria-expanded="false"]');
        const n = await collapsed.count();
        for (let i = 0; i < n; i++) await collapsed.nth(i).click({ timeout: 2000 }).catch(() => {});
        return row.count();
    }, { timeout: 30_000 }).toBeGreaterThan(0);
    await expect(row).toBeVisible();

    // Rows show initials placeholders, not photos, and no avatar was fetched.
    const placeholder = page.getByRole('button', { name: /^Load photo of / }).first();
    await expect(placeholder).toBeVisible();
    expect(await row.locator('img').count()).toBe(0);
    // Rendering the roster rows fetched no avatars (other avatars on the page — header, sidebar — are outside this feature).
    await page.waitForTimeout(1000);
    expect(imageRequests.length - avatarFetchesBeforeRoster).toBe(0);
    const avatarFetchesBefore = imageRequests.length;

    // Tapping the placeholder loads exactly that photo and does NOT open the row.
    await placeholder.click();
    await expect(row.locator('img')).toHaveCount(1, { timeout: 10_000 });
    expect(await page.getByRole('button', { name: /^Edit/i }).count()).toBe(0);
    await expect.poll(() => imageRequests.length - avatarFetchesBefore, { timeout: 10_000 }).toBe(1);
});

test('with the mode off: avatars and the socket behave as before', async ({ page, baseURL }) => {
    test.setTimeout(120_000);
    let socketAttempts = 0;
    page.on('request', (r) => { if (/socket\.io\//.test(r.url())) socketAttempts += 1; });
    page.on('websocket', (ws) => { if (/socket.io/.test(ws.url())) socketAttempts += 1; });
    await loginAdmin(page, baseURL!);
    await expect.poll(() => socketAttempts, { timeout: 15_000 }).toBeGreaterThan(0);
    await page.evaluate(() => (window as any).ADMIN_NAVIGATE('studentList', 'studentList', {}));
    const row = page.getByRole('button', { name: /^View profile for / }).first();
    await expect.poll(async () => {
        const collapsed = page.locator('button[aria-expanded="false"]');
        const n = await collapsed.count();
        for (let i = 0; i < n; i++) await collapsed.nth(i).click({ timeout: 2000 }).catch(() => {});
        return row.count();
    }, { timeout: 30_000 }).toBeGreaterThan(0);
    await expect(row.locator('img')).toHaveCount(1);
    expect(await page.getByRole('button', { name: /^Load photo of / }).count()).toBe(0);
});

// The switch must be reachable from every role's settings area.
for (const [role, hook, view] of [
    ['teacher', 'TEACHER_NAVIGATE', 'settings'],
    ['parent', 'PARENT_NAVIGATE', 'more'],
    ['student', 'STUDENT_NAVIGATE', 'profile'],
] as const) {
    test(`${role} can reach the Low data mode switch`, async ({ page, baseURL }) => {
        test.setTimeout(120_000);
        await page.addInitScript(() => { try { (window as any).__AUDIT_MODE__ = true; localStorage.setItem('audit_mode', 'true'); } catch {} });
        await page.goto(baseURL!, { waitUntil: 'domcontentloaded' });
        await page.getByRole('button', { name: /Try Demo School/i }).click();
        await page.locator(`button:has-text("${role}")`).first().click();
        await page.waitForFunction((h) => typeof (window as any)[h] === 'function', hook, { timeout: 60_000 });
        await page.evaluate(([h, v]) => (window as any)[h](v, v, {}), [hook, view] as const);
        if (view !== 'profile') {
            // Settings hubs are master/detail: open the Data Usage entry first.
            await page.getByRole('button', { name: /Data Usage/ }).first().click({ timeout: 20_000 });
        }
        await expect(page.getByRole('switch', { name: 'Low data mode' })).toBeVisible({ timeout: 20_000 });
    });
}
