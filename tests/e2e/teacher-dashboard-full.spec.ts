import { test, expect } from '@playwright/test';

test.describe('Teacher Dashboard Comprehensive Testing', () => {

    test.use({ viewport: { width: 390, height: 844 }, isMobile: true });

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => {
            localStorage.setItem('pwa-install-dismissed', Date.now().toString());
        });
        await page.waitForLoadState('networkidle');

        // Login via Demo
        await page.getByRole('button', { name: /Try Demo School/ }).click();
        const teacherBtn = page.getByRole('button', { name: /Teacher/i, exact: false });
        await teacherBtn.waitFor({ state: 'visible' });
        await teacherBtn.click();

        // Wait for dashboard to load
        await expect(page.getByText('Fetching teacher profile...')).not.toBeVisible({ timeout: 15000 });
        await expect(page.getByText('Loading teacher workspace...')).not.toBeVisible({ timeout: 15000 });
        
        await expect(page.locator('header h1', { hasText: /Teacher Dashboard/i })).toBeVisible({ timeout: 20000 });
    });

    test('Dashboard: Should navigate through core features', async ({ page }) => {
        // 1. Check overview sections
        // Wait for potential loading state in Overview
        await expect(page.getByText('Recent Assignments')).toBeVisible({ timeout: 15000 });
        await expect(page.getByText('Quick Actions')).toBeVisible();
        await expect(page.getByText('Today\'s Schedule')).toBeVisible();

        // 2. Test Quick Actions exhaustively
        const quickActions = [
            { label: 'Add Student', heading: /Add Student/i },
            { label: 'My Attendance', heading: /My Attendance/i },
            { label: 'Attendance', heading: /Select Class/i, exact: true },
            { label: 'Assignments', heading: /Manage Assignments/i, exact: true },
            { label: 'Lesson Notes', heading: /Lesson Notes/i },
            { label: 'Resources', heading: /Resource Hub/i },
            { label: 'Appointments', heading: /Appointments/i },
            { label: 'Virtual Class', heading: /Virtual Classroom/i },
            { label: 'AI Planner', heading: /AI Lesson Planner/i },
            { label: 'Quiz Builder', heading: /Create Assessment/i },
            { label: 'Gradebook', heading: /Class Gradebook/i },
            { label: 'Exams', heading: /Manage Exams/i },
            { label: 'Forum', heading: /Teacher Forum Dashboard/i, exact: true },
            { label: 'Reports', heading: /Student Reports Dashboard/i, exact: true }
        ];

        for (const action of quickActions) {
            // Target the button specifically within the main content area to avoid sidebar/nav conflicts
            await page.locator('main').getByRole('button', { name: new RegExp(`^${action.label}$`, 'i') }).click();
            
            await expect(page.locator('header h1', { hasText: action.heading })).toBeVisible({ timeout: 10000 });
            await page.getByLabel('Go back').click();
            // Wait to return to Dashboard
            await expect(page.locator('header h1', { hasText: /Teacher Dashboard/i })).toBeVisible();
        }
    });

    test('Navigation: Should work via Bottom Navigation', async ({ page }) => {
        const bottomNav = page.locator('nav.fixed.bottom-0');

        // Test Reports Tab
        await bottomNav.locator('button', { hasText: /^Reports$/ }).click();
        await expect(page.locator('header h1', { hasText: /Student Reports Dashboard/i })).toBeVisible();

        // Test Forum Tab
        await bottomNav.locator('button', { hasText: /^Forum$/ }).click();
        await expect(page.locator('header h1', { hasText: /Forum Dashboard/i })).toBeVisible({ timeout: 10000 });

        // Test Messages Tab
        await bottomNav.locator('button', { hasText: /^Messages$/ }).click();
        await expect(page.locator('header h1', { hasText: /Messages Dashboard/i })).toBeVisible();

        // Test Settings Tab
        await bottomNav.locator('button', { hasText: /^Settings$/ }).click();
        await expect(page.locator('header h1', { hasText: /Settings Dashboard/i })).toBeVisible();
    });
});
