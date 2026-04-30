import { test, expect } from '@playwright/test';

test.describe('Admin Class Module - Full Stack Verification', () => {
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

    test('Verify Class Creation Flow', async ({ page }) => {
        // 1. Navigate to Manage Classes
        await page.evaluate(() => {
            // @ts-ignore
            if (window.ADMIN_NAVIGATE) {
                // @ts-ignore
                window.ADMIN_NAVIGATE('classList', 'Manage Classes');
            }
        });

        await expect(page.getByText(/Academic Levels|No Classes Found/)).toBeVisible();

        // 2. Click Add Class
        const addBtn = page.getByRole('button', { name: /Add Class|Create Class Now/i });
        await addBtn.click();

        await expect(page.getByText('Class Name')).toBeVisible();

        // 3. Fill Class Information
        const testGrade = Math.floor(Math.random() * 10) + 13; // Use high grade to avoid collisions
        const testSection = String.fromCharCode(65 + Math.floor(Math.random() * 26)); // Random letter A-Z
        const testClassName = `QA_Class_Grade_${testGrade}_${testSection}`;

        await page.fill('input[placeholder*="e.g., SSS 3"]', testClassName);
        await page.fill('input[type="number"]', testGrade.toString());
        await page.selectOption('select', 'Secondary');
        await page.fill('input[placeholder*="e.g., A"]', testSection);
        await page.fill('input[placeholder*="e.g., Science"]', 'General');

        // 4. Submit Form
        await page.click('button[type="submit"]');

        // 5. Verify Success Toast and Navigation back to list
        await expect(page.getByText('Class created successfully')).toBeVisible();
        
        // 6. Verify class appears in list
        // Note: The list groups by grade. We might need to find the grade heading first.
        const gradeHeading = page.getByText(`Grade ${testGrade}`, { exact: false });
        await expect(gradeHeading).toBeVisible();
        
        // Expand the grade to see sections if needed (depending on UI state)
        // Check for the section name
        await expect(page.getByText(`Section ${testSection}`)).toBeVisible();
    });

    test('Verify Standard Class Initialization', async ({ page }) => {
        // Navigate to Manage Classes
        await page.evaluate(() => {
            // @ts-ignore
            window.ADMIN_NAVIGATE('classList', 'Manage Classes');
        });

        // If "Use Standard Classes" button is visible, test it
        const initBtn = page.getByRole('button', { name: /Use Standard Classes/i });
        if (await initBtn.isVisible()) {
            await initBtn.click();
            await expect(page.getByText('Standard classes initialized!')).toBeVisible({ timeout: 60000 });
            await expect(page.getByText('Primary 1')).toBeVisible();
        } else {
            console.log('Standard classes already initialized or list not empty.');
        }
    });
});
