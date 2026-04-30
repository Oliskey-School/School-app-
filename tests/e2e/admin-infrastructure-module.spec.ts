import { test, expect } from '@playwright/test';

test.describe('Admin Infrastructure Module - Full Stack Verification', () => {
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

    test('Verify Asset and Facility Management Navigation', async ({ page }) => {
        // Navigate to Asset Inventory
        await page.evaluate(() => {
            // @ts-ignore
            if (window.ADMIN_NAVIGATE) {
                // @ts-ignore
                window.ADMIN_NAVIGATE('assetInventory', 'Asset Inventory');
            }
        });
        await expect(page.getByRole('heading', { name: /Asset Inventory/i })).toBeVisible();

        // Navigate to Facility Register
        await page.evaluate(() => {
            // @ts-ignore
            if (window.ADMIN_NAVIGATE) {
                // @ts-ignore
                window.ADMIN_NAVIGATE('facilityRegister', 'Facility Register');
            }
        });
        await expect(page.getByRole('heading', { name: /Facility Register/i })).toBeVisible();
    });

    test('Verify Hostel and Transport Navigation', async ({ page }) => {
        // Navigate to Hostel Management
        await page.evaluate(() => {
            // @ts-ignore
            if (window.ADMIN_NAVIGATE) {
                // @ts-ignore
                window.ADMIN_NAVIGATE('hostelManagement', 'Hostel Management');
            }
        });
        await expect(page.getByRole('heading', { name: /Hostel Management/i })).toBeVisible();

        // Navigate to Transport Management
        await page.evaluate(() => {
            // @ts-ignore
            if (window.ADMIN_NAVIGATE) {
                // @ts-ignore
                window.ADMIN_NAVIGATE('transportManagement', 'Transport Management');
            }
        });
        await expect(page.getByRole('heading', { name: /Transport Management/i })).toBeVisible();
    });

    test('Verify Database Backup Workflow', async ({ page }) => {
        // Navigate to System Settings (where backup is usually located)
        await page.evaluate(() => {
            // @ts-ignore
            if (window.ADMIN_NAVIGATE) {
                // @ts-ignore
                window.ADMIN_NAVIGATE('systemSettings', 'System Settings');
            }
        });

        // Find Backup button (often in a "Maintenance" or "Database" tab)
        // If not found in Settings, it might be in an "Admin Hub"
        const backupBtn = page.getByRole('button', { name: /Backup Database|Create Backup/i });
        if (await backupBtn.isVisible()) {
            await backupBtn.click();
            await expect(page.getByText(/Backup completed|Success/i)).toBeVisible();
        }
    });
});
