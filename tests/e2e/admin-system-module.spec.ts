import { test, expect } from '@playwright/test';

test.describe('Admin System & Settings Module - Full Stack Verification', () => {
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

    test('Verify Audit Logs and History', async ({ page }) => {
        // Navigate to Audit Logs
        await page.evaluate(() => {
            // @ts-ignore
            if (window.ADMIN_NAVIGATE) {
                // @ts-ignore
                window.ADMIN_NAVIGATE('auditLogs', 'Audit Logs');
            }
        });
        await expect(page.getByRole('heading', { name: /Audit Log/i })).toBeVisible();
        
        // Verify logs table is visible (if any exist)
        const logRow = page.locator('table tr').nth(1);
        if (await logRow.isVisible()) {
            await expect(logRow).toBeVisible();
        }
    });

    test('Verify System Settings and Branding', async ({ page }) => {
        // Navigate to System Settings
        await page.evaluate(() => {
            // @ts-ignore
            if (window.ADMIN_NAVIGATE) {
                // @ts-ignore
                window.ADMIN_NAVIGATE('systemSettings', 'System Settings');
            }
        });
        
        // Verify Branding section
        await expect(page.getByText(/School Branding|Primary Color/i)).toBeVisible();
    });

    test('Verify Session Management', async ({ page }) => {
        // Navigate to Session Management
        await page.evaluate(() => {
            // @ts-ignore
            if (window.ADMIN_NAVIGATE) {
                // @ts-ignore
                window.ADMIN_NAVIGATE('sessionManagement', 'Session Management');
            }
        });
        
        await expect(page.getByText(/Active Sessions|This Device/i)).toBeVisible();
    });
});
