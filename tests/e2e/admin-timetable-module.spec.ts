import { test, expect } from '@playwright/test';

test.describe('Admin Timetable Module - Full Stack Verification', () => {
    test.setTimeout(180000); // 3 minutes (AI generation can take time)

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

    test('Verify AI Timetable Generation Flow', async ({ page }) => {
        // 1. Navigate to Timetable Generator
        await page.evaluate(() => {
            // @ts-ignore
            if (window.ADMIN_NAVIGATE) {
                // @ts-ignore
                window.ADMIN_NAVIGATE('timetableGenerator', 'Timetable Generator');
            }
        });

        await expect(page.getByText('AI Timetable Creator')).toBeVisible();

        // 2. Select a class
        // MultiClassSelector might have a checkbox or button per class
        const firstClassCheckbox = page.locator('div:has-text("Target Classes") input[type="checkbox"]').first();
        if (await firstClassCheckbox.isVisible()) {
            await firstClassCheckbox.check();
        } else {
            // Fallback: click the first div/button if it's a custom picker
            const classBtn = page.locator('div:has-text("Target Classes") button').first();
            await classBtn.click();
        }

        // 3. Add a subject if needed (usually some are default)
        await expect(page.getByText('Subjects & Load')).toBeVisible();

        // 4. Click Generate
        const genBtn = page.getByRole('button', { name: /Generate Timetable/i });
        await genBtn.click();

        // 5. Verify Generating Screen
        await expect(page.getByText('Crafting Schedule...')).toBeVisible();

        // 6. Wait for navigation to Editor (Success)
        // The generator navigates to 'timetableEditor' on success
        await expect(page.getByText('Timetable Editor|Edit Timetables')).toBeVisible({ timeout: 120000 });
        
        // 7. Verify Editor content
        // Should show some slots with subjects
        const timetableSlot = page.locator('.grid div:has-text("Mon")').first(); // Adjust selector based on Editor UI
        await expect(page.locator('table tr, .grid div').first()).toBeVisible();
    });
});
