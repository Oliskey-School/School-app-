import { test, expect, Page, Response } from '@playwright/test';

async function loginAsDemoAdmin(page: Page, baseURL: string) {
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    const demoBtn = page.getByRole('button', { name: /Try Demo School/i });
    await demoBtn.waitFor({ state: 'visible', timeout: 30_000 });
    await demoBtn.click();
    const adminTile = page.locator('button:has-text("admin")').first();
    await adminTile.waitFor({ state: 'visible', timeout: 10_000 });
    await adminTile.click();
    await page.waitForFunction(
        () => typeof (window as any).ADMIN_NAVIGATE === 'function',
        null,
        { timeout: 45_000 }
    );
}

test('paymentPlanModal — Create Payment Plan no longer 500s with empty context', async ({ page, baseURL }) => {
    test.setTimeout(120_000);
    const api5xx: { url: string; status: number }[] = [];
    const api4xx: { url: string; status: number }[] = [];
    page.on('response', (resp: Response) => {
        const url = resp.url();
        if (!/\/payment-plans/.test(url)) return;
        const status = resp.status();
        if (status >= 500) api5xx.push({ url, status });
        else if (status >= 400) api4xx.push({ url, status });
    });

    await loginAsDemoAdmin(page, baseURL!);
    await page.evaluate(() => (window as any).ADMIN_NAVIGATE('paymentPlanModal', 'paymentPlanModal', {}));
    await page.waitForTimeout(1500);

    const createBtn = page.getByRole('button', { name: /Create Payment Plan/i });
    await createBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await createBtn.click();
    await page.waitForTimeout(1500);

    console.log('5xx:', api5xx);
    console.log('4xx:', api4xx);

    expect(api5xx).toHaveLength(0);
});
