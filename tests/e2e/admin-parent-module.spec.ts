import { test, expect } from '@playwright/test';

test.describe('Admin Parent Module - Full Stack Verification', () => {
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

    test('Verify Parent Creation and Student Linking', async ({ page }) => {
        // 1. Navigate to Add Parent
        await page.evaluate(() => {
            // @ts-ignore
            if (window.ADMIN_NAVIGATE) {
                // @ts-ignore
                window.ADMIN_NAVIGATE('addParent', 'Add New Parent');
            }
        });

        await expect(page.getByText('Personal Details')).toBeVisible();

        // 2. Fill Parent Information
        const testName = `QA_Test_Parent_${Date.now()}`;
        await page.fill('#name', testName);
        await page.fill('#email', `qa_parent_${Date.now()}@example.com`);
        await page.fill('#phone', '+2348000000003');
        await page.selectOption('#relationship', 'Father');

        // 3. Link Student (Using a known or search-based ID)
        // We'll search for an existing student first if possible, or just use a dummy one if we are confident
        // For this test, let's assume we can find a student ID from the Student List first
        
        // Step 3a: Go to student list to get a valid ID
        await page.evaluate(() => {
            // @ts-ignore
            window.ADMIN_NAVIGATE('studentList', 'Manage Students');
        });
        await page.waitForSelector('table tr td');
        const studentIdCell = page.locator('table tr td').filter({ hasText: /_STU_/ }).first();
        const studentId = await studentIdCell.innerText();
        
        // Step 3b: Go back to Add Parent
        await page.evaluate(() => {
            // @ts-ignore
            window.ADMIN_NAVIGATE('addParent', 'Add New Parent');
        });
        
        // Refill info (since navigation might have cleared it or it's a new page load)
        await page.fill('#name', testName);
        await page.fill('#email', `qa_parent_${Date.now()}@example.com`);
        await page.fill('#phone', '+2348000000003');
        await page.fill('#childIds', studentId);

        // 4. Submit Form
        await page.click('button[type="submit"]');

        // 5. Verify Credentials Modal (Success)
        await expect(page.getByText('Account Created Successfully')).toBeVisible({ timeout: 30000 });
        await expect(page.getByText(testName)).toBeVisible();

        // 6. Close Modal and verify navigation to Parent List
        await page.getByRole('button', { name: /Done/i }).click();

        // 7. Verify parent in list
        await page.evaluate(() => {
            // @ts-ignore
            window.ADMIN_NAVIGATE('parentList', 'Manage Parents');
        });

        await page.fill('input[placeholder*="Search"]', testName);
        await expect(page.getByText(testName)).toBeVisible();
    });

    test('Verify Parent List and ID Generation', async ({ page }) => {
        // Navigate to Parent List
        await page.evaluate(() => {
            // @ts-ignore
            window.ADMIN_NAVIGATE('parentList', 'Manage Parents');
        });

        // Wait for some data to load
        await expect(page.locator('table tr').nth(1)).toBeVisible();

        // Check if any parent has a generated ID (Format: CODE_BRANCH_PAR_####)
        const idCell = page.locator('table td').filter({ hasText: /_PAR_/ }).first();
        await expect(idCell).toBeVisible();
        
        const idText = await idCell.innerText();
        console.log(`Verified Generated ID: ${idText}`);
        expect(idText).toMatch(/[A-Z0-9]+_[A-Z0-9]+_PAR_\d{4}/);
    });
});
