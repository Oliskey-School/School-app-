import { test, expect } from '@playwright/test';

test.describe('Student Dashboard Comprehensive Testing', () => {

    test.setTimeout(90000); // 90 seconds
    test.use({ viewport: { width: 390, height: 844 }, isMobile: true });

    test.beforeEach(async ({ page }) => {
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

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
        await expect(page.getByText('Loading overview...')).not.toBeVisible({ timeout: 15000 });
        
        // If profile not found appears, the test will fail here.
        await expect(page.locator('header h1', { hasText: /Student Dashboard/i })).toBeVisible({ timeout: 20000 });
    });

    test('Dashboard: Should navigate through core features and AI tools', async ({ page }) => {
        // 1. Check AI Tools & Quick Actions on the overview
        await expect(page.locator('h3', { hasText: /Your Focus/i })).toBeVisible();
        await expect(page.getByText('AI Study Buddy')).toBeVisible();

        // 2. Test Quick Actions
        const quickActions = [
            { label: 'Subjects', heading: /My Subjects/i },
            { label: 'Timetable', heading: /Timetable/i },
            { label: 'Results', heading: /Academic Performance/i },
            { label: 'Games', heading: /Games Hub/i }
        ];

        for (const action of quickActions) {
            await page.locator('main').getByRole('button', { name: new RegExp(`^${action.label}$`, 'i') }).click();
            await expect(page.locator('header h1', { hasText: action.heading })).toBeVisible({ timeout: 10000 });
            await page.getByLabel('Go back').click();
            await expect(page.locator('header h1', { hasText: /Student Dashboard/i })).toBeVisible();
        }

        // 3. Test AI Tools
        const aiTools = [
            { label: 'AI Study Buddy', heading: /Study Buddy/i },
            { label: 'AI Adventure Quest', heading: /AI Adventure Quest/i }
        ];

        for (const tool of aiTools) {
            await page.getByText(tool.label, { exact: true }).click();
            await expect(page.locator('header h1', { hasText: tool.heading })).toBeVisible({ timeout: 10000 });
            await page.getByLabel('Go back').click();
            await expect(page.locator('header h1', { hasText: /Student Dashboard/i })).toBeVisible();
        }
    });

    test('Navigation: Should work via Bottom Navigation', async ({ page }) => {
        const bottomNav = page.locator('nav.fixed.bottom-0');
        
        // Test Quizzes Tab
        await bottomNav.locator('button', { hasText: /^Quizzes$/ }).click();
        await expect(page.locator('header h1', { hasText: /Assessments & Quizzes/i })).toBeVisible();

        // Test Games Tab
        await bottomNav.locator('button', { hasText: /^Games$/ }).click();
        await expect(page.locator('header h1', { hasText: /Games Hub/i })).toBeVisible();

        // Test Messages Tab
        await bottomNav.locator('button', { hasText: /^Messages$/ }).click();
        // Specificity to avoid matching both sidebar and header H1s
        await expect(page.locator('header h1', { hasText: /^Messages Dashboard$/i })).toBeVisible();

        // Test Profile Tab
        await bottomNav.locator('button', { hasText: /^Profile$/ }).click();
        await expect(page.getByText('Personal Information')).toBeVisible();
    });
});
