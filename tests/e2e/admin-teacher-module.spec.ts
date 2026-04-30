import { test, expect } from '@playwright/test';

test.describe('Admin Teacher Module - Full Stack Verification', () => {
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

    test('Verify Teacher Creation Flow', async ({ page }) => {
        // 1. Navigate to Add Teacher
        await page.evaluate(() => {
            // @ts-ignore
            if (window.ADMIN_NAVIGATE) {
                // @ts-ignore
                window.ADMIN_NAVIGATE('addTeacher', 'Add New Teacher');
            }
        });

        await expect(page.getByText('Teacher Information')).toBeVisible();

        // 2. Fill Teacher Information
        const testName = `QA_Test_Teacher_${Date.now()}`;
        await page.fill('#name', testName);
        await page.fill('#email', `qa_teacher_${Date.now()}@example.com`);
        await page.fill('#phone', '+2348000000002');
        
        // Select Primary Curriculum
        await page.selectOption('#primaryCurriculum', 'Nigerian');

        // 3. Select Subjects and Classes (Multi-select interaction)
        // Since custom MultiSelect uses internal state and a filter input, we interact with the input
        const subjectInput = page.locator('div:has-text("Subjects") input[type="text"]');
        await subjectInput.click();
        await subjectInput.fill('Mathematics');
        await page.getByText('Mathematics', { exact: true }).first().click();

        const classInput = page.locator('div:has-text("Classes") input[type="text"]');
        await classInput.click();
        const firstClassOption = page.locator('div.absolute div').first(); // Pick first available class
        if (await firstClassOption.isVisible()) {
            await firstClassOption.click();
        }

        // 4. Compliance Documents (Checkboxes)
        const nigerianCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /Nigerian/i });
        if (await nigerianCheckbox.isVisible()) {
            await nigerianCheckbox.check();
        }

        // 5. Submit Form
        await page.click('button[type="submit"]');

        // 6. Verify Credentials Modal (Success)
        await expect(page.getByText('Account Created Successfully')).toBeVisible({ timeout: 30000 });
        await expect(page.getByText(testName)).toBeVisible();

        // 7. Close Modal and verify navigation to Teacher List
        await page.getByRole('button', { name: /Done/i }).click();

        // 8. Verify teacher in list
        await page.evaluate(() => {
            // @ts-ignore
            window.ADMIN_NAVIGATE('teacherList', 'Manage Teachers');
        });

        await page.fill('input[placeholder*="Search"]', testName);
        await expect(page.getByText(testName)).toBeVisible();
    });

    test('Verify Teacher List and ID Generation', async ({ page }) => {
        // Navigate to Teacher List
        await page.evaluate(() => {
            // @ts-ignore
            window.ADMIN_NAVIGATE('teacherList', 'Manage Teachers');
        });

        // Wait for some data to load
        await expect(page.locator('table tr').nth(1)).toBeVisible();

        // Check if any teacher has a generated ID (Format: CODE_BRANCH_TCH_####)
        const idCell = page.locator('table td').filter({ hasText: /_TCH_/ }).first();
        await expect(idCell).toBeVisible();
        
        const idText = await idCell.innerText();
        console.log(`Verified Generated ID: ${idText}`);
        expect(idText).toMatch(/[A-Z0-9]+_[A-Z0-9]+_TCH_\d{4}/);
    });
});
