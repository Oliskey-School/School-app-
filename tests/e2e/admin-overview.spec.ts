import { test, expect } from '@playwright/test';

test.describe('Admin Route: Overview', () => {
    test('Should load the Admin Overview properly', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Login via Demo
        await page.getByRole('button', { name: /Try Demo School/ }).click();
        const adminBtn = page.getByRole('button', { name: /Admin/i, exact: false });
        await adminBtn.waitFor({ state: 'visible' });
        await adminBtn.click();

        // Verify successful login by checking for the dashboard title
        await expect(page.locator('h1', { hasText: 'Admin Dashboard' }).or(page.locator('h1', { hasText: 'Overview' }))).toBeVisible({ timeout: 15000 });
        // Wait for stats or charts to load
        // We look for any card-like container that holds stats
        await expect(page.locator('.grid').first()).toBeVisible();
    });
});