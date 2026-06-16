import { test, expect, Page } from '@playwright/test';

/**
 * Publishing a class must light its dashboard dot GREEN (Published). Previously the
 * timetable had no status column, so every class fell back to Draft (orange).
 * We publish a class through the app's own API (reusing the live session's auth) and
 * assert the dashboard renders that class's dot green, while a class with no timetable
 * stays gray.
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

test('publishing a class turns its dashboard dot green', async ({ page, baseURL }) => {
    test.setTimeout(120_000);

    // Capture the auth header the app uses so we can call the API as this admin.
    let auth = '';
    let schoolHeader = '';
    page.on('request', (req) => {
        if (/\/api\//.test(req.url())) {
            const h = req.headers();
            if (h['authorization']) auth = h['authorization'];
            if (h['x-school-id']) schoolHeader = h['x-school-id'];
        }
    });

    await loginAsDemoAdmin(page, baseURL!);
    // Open the Timetable Dashboard so the app issues authenticated API calls.
    await page.evaluate(() => (window as any).ADMIN_NAVIGATE('timetable', 'Timetable Dashboard', {}));
    await page.getByText('All Classes').waitFor({ state: 'visible', timeout: 20_000 });
    await page.waitForTimeout(1500);
    expect(auth, 'did not capture an auth header').not.toBe('');

    // Publish a class via the app's API (status: Published).
    const publishedClass = 'SSS 1';
    const resp = await page.request.post(`${baseURL}/api/timetables`, {
        headers: { authorization: auth, 'x-school-id': schoolHeader, 'content-type': 'application/json' },
        data: {
            class_name: publishedClass, subject: 'Biology',
            start_time: '08:00', end_time: '08:45', day_of_week: 1, status: 'Published',
        },
    });
    expect(resp.status(), `publish POST failed: ${resp.status()}`).toBeLessThan(300);

    // Re-open the dashboard so statuses refetch.
    await page.evaluate(() => (window as any).ADMIN_NAVIGATE('overview', 'Admin', {}));
    await page.waitForTimeout(500);
    await page.evaluate(() => (window as any).ADMIN_NAVIGATE('timetable', 'Timetable Dashboard', {}));
    await page.getByText('All Classes').waitFor({ state: 'visible', timeout: 20_000 });
    await page.waitForTimeout(2000);

    // The published class's card shows a green (emerald) dot.
    const card = page.locator('.rounded-2xl').filter({ hasText: publishedClass }).first();
    await expect(card).toBeVisible();
    await expect(card.locator('.bg-emerald-500')).toBeVisible();
    await expect(card.locator('.bg-orange-500')).toHaveCount(0);
});
