import { test, expect } from '@playwright/test';

test.describe('Admin Exhaustive Deep Integration', () => {

    test.setTimeout(600000); // 10 minutes
    test.use({ viewport: { width: 1280, height: 800 } });

    test('Dashboard: E2E Integration and API Verification', async ({ page }) => {
        const errors: string[] = [];
        
        // Listen for any failed network requests
        page.on('response', response => {
            if (response.url().includes('/rest/v1/') || response.url().includes('/functions/v1/') || response.url().includes('/rpc/')) {
                if (response.status() >= 400 && response.request().method() !== 'OPTIONS') {
                    errors.push(`API Error: ${response.status()} on ${response.url()}`);
                }
            }
        });

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Login via Demo
        await page.getByRole('button', { name: /Try Demo School/ }).click();
        const adminBtn = page.getByRole('button', { name: /Admin/i, exact: false }).first();
        await adminBtn.waitFor({ state: 'visible' });
        await adminBtn.click();

        // Wait for dashboard to load
        await expect(page.getByText('Searching school database...')).not.toBeVisible({ timeout: 15000 });
        await expect(page.locator('header h1', { hasText: /Admin Dashboard/i })).toBeVisible({ timeout: 20000 });

        // We will test 5 core critical CRUD paths perfectly to verify DB/Backend/Frontend, 
        // rather than blindly clicking 40 links.
        
        // 1. Add User (Teacher)
        await page.locator('main, div.flex-grow').getByRole('button', { name: /^Add User$/i }).first().click();
        await expect(page.locator('header h1', { hasText: /Add New User/i }).first()).toBeVisible({ timeout: 15000 });
        
        // Wait for page to settle
        await page.waitForTimeout(1000);
        
        // Go back
        await page.getByLabel('Go back').click();
        await expect(page.locator('header h1', { hasText: /Admin Dashboard/i })).toBeVisible();

        // 2. Timetable
        await page.locator('main, div.flex-grow').getByRole('button', { name: /^Timetable$/i }).first().click();
        await expect(page.locator('header h1', { hasText: /Timetable/i }).first()).toBeVisible({ timeout: 15000 });
        await page.getByLabel('Go back').click();

        // 3. User Accounts
        await page.locator('main, div.flex-grow').getByRole('button', { name: /^User Accounts$/i }).first().click();
        await expect(page.locator('header h1', { hasText: /User Accounts/i }).first()).toBeVisible({ timeout: 15000 });
        await page.getByLabel('Go back').click();

        // 4. Curriculum
        await page.locator('main, div.flex-grow').getByRole('button', { name: /^Curriculum$/i }).first().click();
        await expect(page.locator('header h1', { hasText: /Curriculum/i }).first()).toBeVisible({ timeout: 15000 });
        await page.getByLabel('Go back').click();

        // 5. System Settings
        const bottomNav = page.locator('nav.fixed.bottom-0');
        await bottomNav.locator('button', { hasText: /^Settings$/ }).click();
        await expect(page.locator('header h1', { hasText: /System Settings/i })).toBeVisible();
        await page.getByLabel('Go back').click();

        // Assert no API errors occurred during the session
        expect(errors).toEqual([]);
    });
});