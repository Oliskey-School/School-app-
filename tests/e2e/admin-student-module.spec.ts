import { test, expect } from '@playwright/test';

test.describe('Admin Student Module - Full Stack Verification', () => {
    test.setTimeout(180000); // 3 minutes

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.getByPlaceholder(/email/i).fill('admin-global@demo.com');
        await page.getByPlaceholder(/password/i).fill('password123');
        await page.getByRole('button', { name: /sign in/i }).click();

        // Navigate to Admin Dashboard if not already there
        const adminBtn = page.getByRole('button', { name: /Admin/i, exact: false }).first();
        await adminBtn.waitFor({ state: 'visible' });
        await adminBtn.click();
        
        await expect(page.locator('header h1', { hasText: /Admin Dashboard/i })).toBeVisible({ timeout: 20000 });
    });

    test('Verify Student Enrollment Flow', async ({ page }) => {
        // 1. Navigate to Add Student
        await page.getByRole('button', { name: /Add User/i }).first().click({ force: true });
        await expect(page.getByText(/What type of user/i)).toBeVisible();
        await page.getByText('Add New Student').click({ force: true });

        await expect(page.getByText('Student Information')).toBeVisible();

        // 2. Fill Student Information
        const testName = `QA_Test_Student_${Date.now()}`;
        await page.locator('#fullName').fill(testName);
        await page.locator('#gender').selectOption('Male');
        await page.locator('#birthday').fill('2015-05-15');
        
        // Select a branch (if available)
        const branchSelect = page.locator('#branchId');
        if (await branchSelect.isVisible()) {
            await expect(branchSelect.locator('option').nth(1)).toBeVisible({ timeout: 15000 });
            await branchSelect.selectOption({ index: 1 });
        }

        // 3. Select Class Enrollment
        await page.waitForTimeout(3000);
        const classCheckboxes = page.locator('input[type="checkbox"]');
        if (await classCheckboxes.count() > 0) {
            await classCheckboxes.first().check({ force: true });
        }

        // 4. Fill Guardian Information (New Parent)
        await page.locator('#guardianName').fill('QA Guardian');
        await page.locator('#guardianEmail').fill(`qa_parent_${Date.now()}@example.com`);
        await page.locator('#guardianPhone').fill('+2348000000001');

        // 5. Submit Form
        const submitBtn = page.getByRole('button', { name: /Save Student/i });
        await expect(submitBtn).toBeVisible();
        await expect(submitBtn).toBeEnabled();
        
        const enrollmentPromise = page.waitForResponse(response => 
            response.url().includes('/api/students/enroll') && (response.status() === 201 || response.status() === 200),
            { timeout: 60000 }
        );

        console.log('Clicking Save Student...');
        await submitBtn.click({ force: true });

        console.log('Waiting for API response...');
        await enrollmentPromise;

        // 6. Verify Success
        console.log('Waiting for success indicator...');
        await expect(page.locator('body')).toContainText(/Success/i, { timeout: 30000 });
        
        const closeBtn = page.getByRole('button', { name: /Close|Done/i }).first();
        await expect(closeBtn).toBeVisible({ timeout: 15000 });

        // 7. Close Modal
        await closeBtn.click({ force: true });

        // 8. Verify student in list
        await page.getByRole('button', { name: /Dashboard|Home/i }).first().click({ force: true });
        await page.getByRole('button', { name: /Students/i }).first().click({ force: true });

        await page.fill('input[placeholder*="Search"]', testName);
        await page.waitForTimeout(5000);
        const studentRecord = page.locator('div, tr').filter({ hasText: testName }).first();
        await expect(studentRecord).toBeVisible({ timeout: 30000 });
    });

    test('Verify Student Profile and ID Generation', async ({ page }) => {
        // Navigate to Student List
        await page.getByRole('button', { name: /Students/i }).first().click({ force: true });

        // Wait for some data to load
        await expect(page.getByRole('button', { name: /By Stage|By Class/i }).first()).toBeVisible({ timeout: 20000 });
        
        // Search for "Demo"
        await page.fill('input[placeholder*="Search"]', 'Demo');
        await page.waitForTimeout(3000);

        // Check if any student ID is visible
        const idLabel = page.getByText(/ID:/i).first();
        await expect(idLabel).toBeVisible({ timeout: 20000 });
        
        const idText = await idLabel.innerText();
        console.log(`Verified Student ID: ${idText}`);
        expect(idText).toContain('ID:');
    });
});
