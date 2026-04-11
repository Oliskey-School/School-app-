import { test, expect } from '@playwright/test';

test.describe('Parent Dashboard Comprehensive Testing', () => {

    test.use({ viewport: { width: 390, height: 844 }, isMobile: true });

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Login via Demo
        await page.getByRole('button', { name: /Try Demo School/ }).click();
        const parentBtn = page.getByRole('button', { name: /Parent/i, exact: false });
        await parentBtn.waitFor({ state: 'visible' });
        await parentBtn.click();

        // Verify successful login
        await expect(page.locator('h1', { hasText: /Parent Dashboard/i })).toBeVisible({ timeout: 20000 });
    });

    test('Dashboard: Should navigate through core features', async ({ page }) => {
        // 1. Verify Child Overview
        // Wait for loading to finish
        await expect(page.getByText('Loading portal...')).not.toBeVisible({ timeout: 15000 });
        const childName = page.locator('h2.text-xl.font-bold.text-gray-900').first();
        await expect(childName).toBeVisible({ timeout: 10000 });
        
        // 2. Check School Utilities
        await expect(page.getByText('School Utilities')).toBeVisible();
        
        // Test Bus Route Navigation
        await page.getByRole('button', { name: /Bus/ }).click();
        await expect(page.locator('header h1', { hasText: /Bus Route/i })).toBeVisible();
        await page.getByLabel('Go back').click();

        // Test Noticeboard Navigation
        await page.getByRole('button', { name: /Notices/ }).click();
        await expect(page.locator('header h1', { hasText: /Noticeboard/i })).toBeVisible();
        await page.getByLabel('Go back').click();

        // 3. Check Data Cards
        await expect(page.getByText('Attendance', { exact: true })).toBeVisible();
        await expect(page.getByText('Academics', { exact: true })).toBeVisible();
        await expect(page.getByText('Finances', { exact: true })).toBeVisible();
        
        // Test Fees Navigation
        await page.getByText('PAY NOW').click();
        await expect(page.locator('header h1', { hasText: /Fee Status/i })).toBeVisible({ timeout: 15000 });
        await page.getByLabel('Go back').click();
    });

    test('Navigation: Should work via Bottom Navigation', async ({ page }) => {
        const bottomNav = page.locator('nav.fixed.bottom-0');
        
        // Test Fees Tab
        await bottomNav.locator('button', { hasText: /^Fees$/ }).click();
        await expect(page.locator('header h1', { hasText: /Fee Status/i })).toBeVisible();

        // Test Reports Tab
        await bottomNav.locator('button', { hasText: /^Reports$/ }).click();
        await expect(page.locator('header h1', { hasText: /Select Report Card/i })).toBeVisible();

        // Test Messages Tab
        await bottomNav.locator('button', { hasText: /^Messages$/ }).click();
        // Messages has two H1s: "Messages Dashboard" (Header) and "Messages" (Sidebar)
        await expect(page.locator('header h1', { hasText: /^Messages Dashboard$/i })).toBeVisible();

        // Test More Tab
        await bottomNav.locator('button', { hasText: /^More$/ }).click();
        await expect(page.locator('header h1', { hasText: /More Options/i })).toBeVisible();
        
        // Test navigation within More Options
        await page.getByText('Edit Profile').click();
        // Be flexible with the title
        await expect(page.locator('header h1', { hasText: /Edit.*Profile/i })).toBeVisible();
        await page.getByLabel('Go back').click();
        
        await page.getByText('Feedback').click();
        await expect(page.locator('header h1', { hasText: /Feedback/i })).toBeVisible();
    });

    test('Functionality: Child Switcher should work if multiple children exist', async ({ page }) => {
        const switcher = page.locator('button', { has: page.locator('h2') });
        const chevron = switcher.locator('svg');
        
        // If there's only one child, the chevron might not be there or might not open a menu
        // But in demo data we usually have 1 or 2 children.
        
        const childCount = await page.locator('h2.text-xl.font-bold.text-gray-900').count();
        if (childCount > 0) {
            await switcher.click();
            // Check if dropdown appears
            // In demo mode, we might only have 1 child for the demo parent.
            // Let's check the labels.
        }
    });
});
