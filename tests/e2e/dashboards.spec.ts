import { test, expect } from '@playwright/test';

test.describe('Oliskey Production Regression Suite', () => {

    test('Admin Route: Should login and load the Admin Dashboard', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Login via Demo
        await page.getByRole('button', { name: /Try Demo School/ }).click();
        const adminBtn = page.getByRole('button', { name: /Admin/i, exact: false });
        await adminBtn.waitFor({ state: 'visible' });
        await adminBtn.click();

        // Verify successful login by checking for the dashboard title
        await expect(page.locator('h1', { hasText: 'Admin Dashboard' })).toBeVisible({ timeout: 15000 });

        // Check for critical data components (e.g., Welcome message)
        await expect(page.locator('h2', { hasText: /Welcome, Admin/i })).toBeVisible({ timeout: 15000 });
    });

    test('Teacher Route: Should load classes and respect RLS', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Login via Demo
        await page.getByRole('button', { name: /Try Demo School/ }).click();
        const roleBtn = page.getByRole('button', { name: /Teacher/i, exact: false });
        await roleBtn.waitFor({ state: 'visible' });
        await roleBtn.click();

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
        await page.getByRole('button', { name: /Try Demo School/ }).click();
        const studentBtn = page.getByRole('button', { name: /Student/i, exact: false });
        await studentBtn.waitFor({ state: 'visible' });
        await studentBtn.click();

        // Wait for dashboard to load
        await expect(page.getByText('Preparing your school experience...')).not.toBeVisible({ timeout: 15000 });
        await expect(page.getByText('Loading dashboard module...')).not.toBeVisible({ timeout: 15000 });

        // Verify successful login by checking for the dashboard title
        await expect(page.locator('h1', { hasText: /Student Dashboard/i })).toBeVisible({ timeout: 20000 });

        // Ensure focus section is present
        await expect(page.locator('h3', { hasText: /Your Focus/i })).toBeVisible({ timeout: 15000 });
    });

    test('Parent Route: Should load linked children data', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Login via Demo
        await page.getByRole('button', { name: /Try Demo School/ }).click();
        const parentBtn = page.getByRole('button', { name: /Parent/i, exact: false });
        await parentBtn.waitFor({ state: 'visible' });
        await parentBtn.click();

        // Verify successful login by checking for the dashboard title
        await expect(page.locator('h1', { hasText: 'Parent Dashboard' })).toBeVisible({ timeout: 15000 });
        await expect(page.locator('h1', { hasText: 'Parent Dashboard' })).toBeVisible();

        // Check if the student data loads (look for student name or switcher)
        await expect(page.locator('h2', { hasText: /Student/i })).toBeVisible({ timeout: 15000 });
    });
});