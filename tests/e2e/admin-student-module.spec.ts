import { test, expect } from '@playwright/test';

test.describe('Admin Student Module - Full Stack Verification', () => {
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

    test('Verify Student Enrollment Flow', async ({ page }) => {
        // 1. Navigate to Add Student
        await page.evaluate(() => {
            // @ts-ignore
            if (window.ADMIN_NAVIGATE) {
                // @ts-ignore
                window.ADMIN_NAVIGATE('addStudent', 'Add New Student');
            }
        });

        await expect(page.getByText('Student Information')).toBeVisible();

        // 2. Fill Student Information
        const testName = `QA_Test_Student_${Date.now()}`;
        await page.fill('#fullName', testName);
        await page.selectOption('#gender', 'Male');
        await page.fill('#birthday', '2015-05-15');
        
        // Select a branch (if available)
        const branchSelect = page.locator('#branchId');
        if (await branchSelect.isVisible()) {
            const options = await branchSelect.locator('option').all();
            if (options.length > 1) {
                await branchSelect.selectOption({ index: 1 });
            }
        }

        // 3. Select Class Enrollment
        const classCheckbox = page.locator('input[type="checkbox"]').first();
        if (await classCheckbox.isVisible()) {
            await classCheckbox.check();
        }

        // 4. Fill Guardian Information (New Parent)
        await page.fill('#guardianName', 'QA Guardian');
        await page.fill('#guardianEmail', `qa_parent_${Date.now()}@example.com`);
        await page.fill('#guardianPhone', '+2348000000001');

        // 5. Submit Form
        await page.click('button[type="submit"]');

        // 6. Verify Credentials Modal (Success)
        await expect(page.getByText('Account Created Successfully')).toBeVisible({ timeout: 30000 });
        await expect(page.getByText(testName)).toBeVisible();

        // 7. Close Modal and verify navigation to Student List
        await page.getByRole('button', { name: /Done/i }).click();

        // 8. Verify student in list
        await page.evaluate(() => {
            // @ts-ignore
            window.ADMIN_NAVIGATE('studentList', 'Manage Students');
        });

        await page.fill('input[placeholder*="Search"]', testName);
        await expect(page.getByText(testName)).toBeVisible();
    });

    test('Verify Student Profile and ID Generation', async ({ page }) => {
        // Navigate to Student List
        await page.evaluate(() => {
            // @ts-ignore
            window.ADMIN_NAVIGATE('studentList', 'Manage Students');
        });

        // Wait for some data to load
        await expect(page.locator('table tr').nth(1)).toBeVisible();

        // Check if any student has a generated ID (Format: CODE_BRANCH_STU_####)
        const idCell = page.locator('table td').filter({ hasText: /_STU_/ }).first();
        await expect(idCell).toBeVisible();
        
        const idText = await idCell.innerText();
        console.log(`Verified Generated ID: ${idText}`);
        expect(idText).toMatch(/[A-Z0-9]+_[A-Z0-9]+_STU_\d{4}/);
    });
});
