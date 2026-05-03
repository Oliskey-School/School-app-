import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard Overview - Full Stack Verification', () => {
    test.setTimeout(120000); // 2 minutes

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        
        // Login via Demo
        const demoBtn = page.getByRole('button', { name: /Try Demo School/i });
        if (await demoBtn.isVisible()) {
            await demoBtn.click();
        }
        
        const adminBtn = page.getByRole('button', { name: /Admin/i, exact: false }).first();
        await adminBtn.waitFor({ state: 'visible' });
        await adminBtn.click();
        
        await expect(page.locator('header h1', { hasText: /Admin Dashboard/i })).toBeVisible({ timeout: 20000 });
    });

    test('Verify Dashboard Stats and UI Elements', async ({ page }) => {
        // Wait for loading to finish
        await expect(page.getByText(/Loading dashboard statistics/i)).not.toBeVisible({ timeout: 30000 });

        // 1. Verify Stat Cards
        await expect(page.getByText('Total Students')).toBeVisible();
        await expect(page.getByText('Total Staff')).toBeVisible();
        await expect(page.getByText('Total Parents')).toBeVisible();
        await expect(page.getByText('Academic Levels')).toBeVisible();

        // 2. Verify values are loaded
        const studentCount = page.locator('button:has-text("Total Students") p').nth(1);
        await expect(studentCount).not.toBeEmpty();

        // 3. Verify Quick Actions
        await expect(page.getByText(/Quick Actions/i).first()).toBeVisible();
        await expect(page.getByText('Add User', { exact: true }).first()).toBeVisible();
        await expect(page.getByText('Approvals', { exact: true }).first()).toBeVisible();
        await expect(page.getByText('Enroll Student', { exact: true }).first()).toBeVisible();

        // 4. Verify Recent Activity
        await expect(page.getByText(/Recent Activity/i).first()).toBeVisible();
        await expect(page.locator('button:has-text("View Full Log")').first()).toBeVisible();
    });

    test('Verify Navigation from Quick Actions', async ({ page }) => {
        // Wait for loading to finish
        await expect(page.getByText(/Loading dashboard statistics/i)).not.toBeVisible({ timeout: 30000 });

        // Click "Add User"
        await page.getByText('Add User', { exact: true }).first().click();
        
        // Should navigate to "Select User Type"
        await expect(page.getByText(/What type of user|Select User Type/i)).toBeVisible({ timeout: 15000 });
        
        // Navigate back to Dashboard using the sidebar or bottom nav 'Home' / 'Dashboard'
        await page.getByRole('button', { name: /Dashboard|Home/i }).first().click();
        
        await expect(page.getByText(/Quick Actions/i).first()).toBeVisible({ timeout: 15000 });
    });
});
