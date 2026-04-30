import { test, expect } from '@playwright/test';

test.describe('Admin Exam Module - Full Stack Verification', () => {
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

    test('Verify Exam Creation and Publishing Flow', async ({ page }) => {
        // 1. Navigate to Exam Management
        await page.evaluate(() => {
            // @ts-ignore
            if (window.ADMIN_NAVIGATE) {
                // @ts-ignore
                window.ADMIN_NAVIGATE('examManagement', 'Manage Exams');
            }
        });

        await expect(page.getByText(/Teacher|Curriculum Track/)).toBeVisible();

        // 2. Add New Exam
        // The "Add Exam" might be in a Floating Action Button or a standard button
        const addBtn = page.locator('button:has-text("Add Exam"), button:has-text("Create Exam")').first();
        if (await addBtn.isVisible()) {
            await addBtn.click();
        } else {
            // Check for the "External Exams Page" button and look for an add button there or use window nav
            await page.evaluate(() => {
                // @ts-ignore
                window.ADMIN_NAVIGATE('addExam', 'Add New Exam');
            });
        }

        await expect(page.getByText('Exam Type')).toBeVisible();

        // 3. Fill Exam Information
        const testSubject = `QA_Exam_Subject_${Date.now()}`;
        await page.selectOption('select:has-text("Exam Type"), #exam-type', 'WAEC');
        await page.fill('input[placeholder*="Subject"], #subject', testSubject);
        await page.fill('input[placeholder*="Class"], #className', 'SSS 3');
        
        // Date picker interaction
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toISOString().split('T')[0];
        await page.fill('input[type="date"]', dateStr);

        // 4. Submit Form
        await page.click('button[type="submit"]');

        // 5. Verify success and check in list
        await expect(page.getByText('Exam created successfully')).toBeVisible();
        await expect(page.getByText(testSubject)).toBeVisible();

        // 6. Test Publish functionality
        const publishBtn = page.locator(`div:has-text("${testSubject}")`).getByRole('button', { name: /Publish/i });
        if (await publishBtn.isVisible()) {
            await publishBtn.click();
            await expect(page.getByText('Exam published successfully')).toBeVisible();
            await expect(page.locator(`div:has-text("${testSubject}")`).getByText('Published')).toBeVisible();
        }
    });
});
