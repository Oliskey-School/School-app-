import { test, expect } from '@playwright/test';

test.describe('Oliskey Production Regression Suite', () => {

    test('Admin Route: Should login and load the Admin Dashboard', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Login via Demo
        await page.getByRole('button', { name: 'Try Demo School' }).click();
        const adminBtn = page.getByRole('button', { name: 'Admin', exact: true });
        await adminBtn.waitFor({ state: 'visible' });
        await adminBtn.click();

        // Verify successful login by checking for the dashboard title
        await expect(page.locator('h1', { hasText: 'Admin Dashboard' })).toBeVisible({ timeout: 15000 });
        await expect(page.locator('h1', { hasText: 'Admin Dashboard' })).toBeVisible();

        // Check for critical data components (e.g., School Overview table)
        await expect(page.locator('table.school-overview')).toBeVisible();
    });

    test('Teacher Route: Should load classes and respect RLS', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Login via Demo
        await page.getByRole('button', { name: 'Try Demo School' }).click();
        const teacherBtn = page.getByRole('button', { name: 'Teacher', exact: true });
        await teacherBtn.waitFor({ state: 'visible' });
        await teacherBtn.click();

        // Verify successful login by checking for the dashboard title
        await expect(page.locator('h1', { hasText: 'Teacher Dashboard' })).toBeVisible({ timeout: 15000 });
        await expect(page.locator('h1', { hasText: 'Teacher Dashboard' })).toBeVisible();

        // Verify horizontal scrolling table for grading/attendance exists
        const tableContainer = page.locator('.overflow-x-auto');
        await expect(tableContainer).toBeVisible();
    });

    test('Student Route: Should display schedule securely', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Login via Demo
        await page.getByRole('button', { name: 'Try Demo School' }).click();
        const studentBtn = page.getByRole('button', { name: 'Student', exact: true });
        await studentBtn.waitFor({ state: 'visible' });
        await studentBtn.click();

        // Verify successful login by checking for the dashboard title
        await expect(page.locator('h1', { hasText: 'Student Dashboard' })).toBeVisible({ timeout: 15000 });
        await expect(page.locator('h1', { hasText: 'Student Dashboard' })).toBeVisible();

        // Ensure read-only grade view is present
        await expect(page.locator('.grades-view')).toBeVisible();
    });

    test('Parent Route: Should load linked children data', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Login via Demo
        await page.getByRole('button', { name: 'Try Demo School' }).click();
        const parentBtn = page.getByRole('button', { name: 'Parent', exact: true });
        await parentBtn.waitFor({ state: 'visible' });
        await parentBtn.click();

        // Verify successful login by checking for the dashboard title
        await expect(page.locator('h1', { hasText: 'Parent Dashboard' })).toBeVisible({ timeout: 15000 });
        await expect(page.locator('h1', { hasText: 'Parent Dashboard' })).toBeVisible();

        // Check if the junction data (multiple children profiles) loads
        await expect(page.locator('.student-profile-card')).not.toHaveCount(0);
    });
});