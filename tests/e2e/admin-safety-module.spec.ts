import { test, expect } from '@playwright/test';

test.describe('Admin Safety & Compliance Module - Full Stack Verification', () => {
    test.setTimeout(120000);

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        
        const demoBtn = page.getByRole('button', { name: /Try Demo School/i });
        if (await demoBtn.isVisible()) {
            await demoBtn.click();
        }
        
        const adminBtn = page.getByRole('button', { name: /Admin/i, exact: false }).first();
        await adminBtn.waitFor({ state: 'visible' });
        await adminBtn.click();
        
        await expect(page.locator('header h1', { hasText: /Admin Dashboard/i })).toBeVisible({ timeout: 20000 });
    });

    test('Verify Health Log Entry and Persistence', async ({ page }) => {
        // Navigate to Health Log
        await page.evaluate(() => {
            // @ts-ignore
            if (window.ADMIN_NAVIGATE) {
                // @ts-ignore
                window.ADMIN_NAVIGATE('healthLog', 'Health Log');
            }
        });
        await expect(page.getByRole('heading', { name: /Health Log/i })).toBeVisible();

        const testNotes = `Automated Health Log Entry ${Date.now()}`;

        // Fill Form
        // We select the first student in the dropdown
        await page.getByLabel(/Student/i).first().click();
        await page.locator('option').first().click(); // Fallback if it's a native select
        
        await page.getByPlaceholder(/Notes|Description/i).fill(testNotes);
        await page.getByRole('button', { name: /Log Incident|Save/i }).click();

        // Verify Success and History
        await expect(page.getByText(/Logged Successfully|Success/i)).toBeVisible();
        await expect(page.getByText(testNotes)).toBeVisible({ timeout: 10000 });
    });

    test('Verify Compliance Dashboard Metrics', async ({ page }) => {
        // Navigate to Compliance Dashboard
        await page.evaluate(() => {
            // @ts-ignore
            if (window.ADMIN_NAVIGATE) {
                // @ts-ignore
                window.ADMIN_NAVIGATE('compliance', 'Compliance Dashboard');
            }
        });
        
        // Verify core metrics cards are visible
        await expect(page.getByText(/Compliance Score|Integrity Status/i)).toBeVisible();
    });
});
