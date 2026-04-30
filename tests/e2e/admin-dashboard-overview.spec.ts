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
        // 1. Verify Stat Cards
        await expect(page.getByText('Total Students')).toBeVisible();
        await expect(page.getByText('Total Teachers')).toBeVisible();
        await expect(page.getByText('Total Parents')).toBeVisible();
        await expect(page.getByText('Academic Levels')).toBeVisible();

        // 2. Verify values are loaded (not just 0 if data exists, but checking visibility is enough for QA audit)
        const studentCount = page.locator('button:has-text("Total Students") p').nth(1);
        await expect(studentCount).not.toBeEmpty();

        // 3. Verify Quick Actions
        await expect(page.getByText('Quick Actions')).toBeVisible();
        await expect(page.getByText('Add User')).toBeVisible();
        await expect(page.getByText('Approvals')).toBeVisible();
        await expect(page.getByText('Enroll Student')).toBeVisible();

        // 4. Verify Recent Activity
        await expect(page.getByText('Recent Activity')).toBeVisible();
        await expect(page.locator('button:has-text("View Full Log")')).toBeVisible();
    });

    test('Verify Navigation from Quick Actions', async ({ page }) => {
        // Click "Add User"
        await page.getByText('Add User').click();
        
        // Should navigate to "Select User Type"
        await expect(page.getByText(/What type of user|Select User Type/i)).toBeVisible();
        
        // Navigate back to Dashboard
        await page.evaluate(() => {
            // @ts-ignore
            if (window.ADMIN_NAVIGATE) {
                // @ts-ignore
                window.ADMIN_NAVIGATE('overview', 'Dashboard Overview');
            }
        });
        
        await expect(page.getByText('Quick Actions')).toBeVisible();
    });
});
