import { test, expect } from '@playwright/test';

/**
 * Deep Integration Tests for Admin Dashboard
 * This test suite covers CRUD operations for:
 * 1. Classes
 * 2. Students
 * 3. Teachers
 * 4. Parents
 * 
 * It verifies:
 * - Form filling
 * - Submission
 * - 200 OK network responses
 * - UI updates
 */

test.describe('Admin Deep Integration', () => {
    test.setTimeout(600000); // 10 minutes for extensive testing
    test.use({ viewport: { width: 1280, height: 800 } });

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Login via Demo
        await page.getByRole('button', { name: /Try Demo School/ }).click();
        const adminBtn = page.getByRole('button', { name: /Admin/i, exact: false }).first();
        await adminBtn.waitFor({ state: 'visible' });
        await adminBtn.click();

        // Wait for dashboard to load
        await expect(page.getByText('Searching school database...')).not.toBeVisible({ timeout: 15000 });
        await expect(page.locator('header h1', { hasText: /Admin Dashboard/i })).toBeVisible({ timeout: 20000 });
    });

    test('Class Management: Create, Read, Update', async ({ page }) => {
        // Navigate to Classes
        await page.getByRole('button', { name: /^Classes$/i }).click();
        await expect(page.locator('header h1', { hasText: /Classes/i })).toBeVisible();

        const className = `Test Class ${Date.now()}`;
        
        // 1. Create Class
        await page.getByRole('button', { name: /Add Class/i }).click();
        await page.getByPlaceholder(/e.g., SSS 3 or Gold Class/i).fill(className);
        await page.getByPlaceholder(/e.g., 10/i).fill('10');
        await page.locator('select').selectOption('SSS');
        
        // Monitor network request
        const createPromise = page.waitForResponse(response => 
            response.url().includes('/rest/v1/classes') && response.request().method() === 'POST' && response.status() === 201
        );
        
        await page.getByRole('button', { name: /^Create$/i }).click();
        await createPromise;
        
        // Verify UI update
        await expect(page.getByText(className)).toBeVisible();

        // 2. Update Class
        await page.getByText(className).click();
        const updatedName = `${className} Updated`;
        await page.getByPlaceholder(/e.g., SSS 3 or Gold Class/i).fill(updatedName);
        
        const updatePromise = page.waitForResponse(response => 
            response.url().includes('/rest/v1/classes') && response.request().method() === 'PATCH' && response.status() === 204
        );
        
        await page.getByRole('button', { name: /^Update$/i }).click();
        await updatePromise;

        // Verify UI update
        await expect(page.getByText(updatedName)).toBeVisible();
    });

    test('Student Management: Enroll Student', async ({ page }) => {
        // Navigate to Student List
        await page.getByRole('button', { name: /^Students$/i }).click();
        await expect(page.locator('header h1', { hasText: /Students/i })).toBeVisible();

        const studentName = `Student ${Date.now()}`;
        
        // 1. Create Student
        await page.getByRole('button', { name: /Add Student/i }).click();
        await page.getByPlaceholder(/Adebayo Adewale/i).fill(studentName);
        await page.locator('select#gender').selectOption('Male');
        await page.locator('input[type="date"]').fill('2010-01-01');
        
        // Select a class if available
        const classCheckbox = page.locator('input[type="checkbox"]').first();
        if (await classCheckbox.isVisible()) {
            await classCheckbox.check();
        }

        // Parent info
        await page.getByPlaceholder(/Mr. Adewale/i).fill('Parent Name');
        await page.getByPlaceholder(/guardian@example.com/i).fill(`parent_${Date.now()}@test.com`);
        
        // Monitor enrollment request (this usually calls a backend function or RPC)
        const enrollPromise = page.waitForResponse(response => 
            (response.url().includes('/functions/v1/') || response.url().includes('/rpc/')) && response.status() === 200
        );

        await page.getByRole('button', { name: /Save Student/i }).click();
        await enrollPromise;

        // Wait for Credentials Modal
        await expect(page.getByText(/Credentials Generated/i)).toBeVisible({ timeout: 15000 });
        await page.getByRole('button', { name: /Close/i }).click();

        // Verify in list
        await expect(page.getByText(studentName)).toBeVisible();
    });

    test('Teacher Management: Add Teacher', async ({ page }) => {
        // Navigate to Teachers
        await page.getByRole('button', { name: /^Teachers$/i }).click();
        await expect(page.locator('header h1', { hasText: /Teachers/i })).toBeVisible();

        const teacherName = `Teacher ${Date.now()}`;
        const teacherEmail = `teacher_${Date.now()}@test.com`;
        
        // 1. Create Teacher
        await page.getByRole('button', { name: /Add Teacher/i }).click();
        await page.getByPlaceholder(/Full Name/i).fill(teacherName);
        await page.getByPlaceholder(/Email/i).fill(teacherEmail);
        await page.getByPlaceholder(/Phone/i).fill('08012345678');
        
        // Monitor create request
        const createPromise = page.waitForResponse(response => 
            (response.url().includes('/functions/v1/') || response.url().includes('/rpc/')) && response.status() === 200
        );

        await page.getByRole('button', { name: /Save Teacher/i }).click();
        await createPromise;

        // Wait for Credentials Modal
        await expect(page.getByText(/Credentials Generated/i)).toBeVisible({ timeout: 15000 });
        await page.getByRole('button', { name: /Close/i }).click();

        // Verify in list
        await expect(page.getByText(teacherName)).toBeVisible();
    });

    test('Parent Management: Add Parent', async ({ page }) => {
        // Navigate to Parents
        await page.getByRole('button', { name: /^Parents$/i }).click();
        await expect(page.locator('header h1', { hasText: /Parents/i })).toBeVisible();

        const parentName = `Parent ${Date.now()}`;
        const parentEmail = `parent_only_${Date.now()}@test.com`;
        
        // 1. Create Parent
        await page.getByRole('button', { name: /Add Parent/i }).click();
        await page.getByPlaceholder(/e.g. John Doe/i).fill(parentName);
        await page.getByPlaceholder(/john.doe@example.com/i).fill(parentEmail);
        await page.getByPlaceholder(/\+1234567890/i).first().fill('08012345678');
        
        // Monitor create request
        const createPromise = page.waitForResponse(response => 
            (response.url().includes('/functions/v1/') || response.url().includes('/rpc/')) && response.status() === 200
        );

        await page.getByRole('button', { name: /Save Parent/i }).click();
        await createPromise;

        // Wait for Credentials Modal
        await expect(page.getByText(/Credentials Generated/i)).toBeVisible({ timeout: 15000 });
        await page.getByRole('button', { name: /Close/i }).click();

        // Verify in list
        await expect(page.getByText(parentName)).toBeVisible();
    });
});
