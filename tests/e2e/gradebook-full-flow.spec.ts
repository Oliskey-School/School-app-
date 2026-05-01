import { test, expect } from '@playwright/test';

/**
 * Gradebook and Report Card Full Flow
 * 
 * Flow:
 * 1. Teacher enters grades in Gradebook and submits for review.
 * 2. Admin reviews submitted report cards and publishes them.
 * 3. Parent logs in and views the published result for their child.
 * 4. Student logs in and views their own published results and digital report card.
 */
test.describe('Gradebook and Report Card Full Flow', () => {
    test.setTimeout(240000); // 4 minutes

    const TEACHER_EMAIL = 'teacher-global@demo.com';
    const ADMIN_EMAIL = 'admin-global@demo.com';
    const PARENT_EMAIL = 'parent-global@demo.com';
    const STUDENT_EMAIL = 'student-global@demo.com';
    const PASSWORD = 'password123';

    test('Full Lifecycle: Entry -> Publish -> Parent View -> Student View', async ({ page }) => {
        // --- 1. Teacher Entry ---
        await page.goto('/');
        await page.getByPlaceholder(/email/i).fill(TEACHER_EMAIL);
        await page.getByPlaceholder(/password/i).fill(PASSWORD);
        await page.getByRole('button', { name: /sign in/i }).click();

        // Wait for Teacher Dashboard
        await expect(page.getByText(/Teacher Dashboard/i)).toBeVisible({ timeout: 20000 });

        // Navigate to Gradebook
        await page.getByRole('button', { name: /Gradebook/i }).click();
        await expect(page.getByRole('heading', { name: /Class Gradebook/i }).first()).toBeVisible({ timeout: 15000 });

        // Enter scores for Demo Student
        // Using aria-labels added previously
        const t1Input = page.getByLabel(/Test 1 score for Demo Student/i);
        const t2Input = page.getByLabel(/Test 2 score for Demo Student/i);
        const examInput = page.getByLabel(/Exam score for Demo Student/i);
        
        await expect(t1Input).toBeVisible({ timeout: 10000 });
        await t1Input.fill('18');
        await t2Input.fill('17');
        await examInput.fill('55');

        // Verify Total (90) and Grade (A) in the student row
        const studentRow = page.locator('tr').filter({ hasText: /Demo Student/i }).first();
        await expect(studentRow.getByText('90', { exact: true })).toBeVisible();
        await expect(studentRow.getByRole('cell', { name: 'A', exact: true })).toBeVisible();

        // Submit grades
        await page.getByRole('button', { name: /Submit/i, exact: true }).click();
        await expect(page.getByText(/Successfully submitted grades/i)).toBeVisible();

        // Close Gradebook and return to dashboard
        await page.getByRole('button', { name: 'Close', exact: true }).click();
        await expect(page.getByText(/Teacher Dashboard/i)).toBeVisible({ timeout: 10000 });
        
        // Use a more robust logout: look for it in the whole page
        await page.getByRole('button', { name: /Logout/i }).first().click();

        // --- 2. Admin Publish ---
        await page.getByPlaceholder(/email/i).fill(ADMIN_EMAIL);
        await page.getByPlaceholder(/password/i).fill(PASSWORD);
        await page.getByRole('button', { name: /sign in/i }).click();

        await expect(page.getByText(/Admin Dashboard/i)).toBeVisible({ timeout: 20000 });

        // Navigate to Report Card Publishing
        await page.getByRole('button', { name: /Publish Reports/i }).click();
        
        // Wait for data synchronization
        await expect(page.getByText(/Synchronizing Academic Data/i)).not.toBeVisible({ timeout: 30000 });
        
        // Be extra sure we are on the right page
        await expect(page.getByText(/Registry/i).first()).toBeVisible({ timeout: 15000 });
        await page.waitForTimeout(3000); 

        // Go to 'SUBMITTED' tab
        // Use a simpler text selector
        await page.getByText('SUBMITTED', { exact: false }).first().click({ force: true });
        
        await page.waitForTimeout(2000); 

        // Find Demo Student card
        // Search first to be sure
        const searchInput = page.getByPlaceholder(/Filter by name/i);
        if (await searchInput.isVisible()) {
            await searchInput.fill('Demo Student');
            await page.waitForTimeout(2000);
        }

        const adminStudentCard = page.locator('div').filter({ hasText: /DEMO STUDENT/i }).last();
        await expect(adminStudentCard).toBeVisible({ timeout: 20000 });
        
        // Wait for Publish button in card to be ready
        const publishBtn = adminStudentCard.getByRole('button', { name: /Publish/i, exact: true });
        await expect(publishBtn).toBeVisible({ timeout: 10000 });
        await publishBtn.click({ force: true });

        await expect(page.getByText(/Report published successfully/i)).toBeVisible({ timeout: 10000 });

        // Logout
        await page.locator('aside').getByRole('button', { name: /Logout/i }).click();

        // --- 3. Parent View ---
        await page.getByPlaceholder(/email/i).fill(PARENT_EMAIL);
        await page.getByPlaceholder(/password/i).fill(PASSWORD);
        await page.getByRole('button', { name: /sign in/i }).click();

        await expect(page.getByText(/Parent Dashboard/i)).toBeVisible({ timeout: 20000 });

        // Navigate to Reports via Bottom Nav
        await page.locator('nav').getByRole('button', { name: /Reports/i }).click();
        
        // Select Child
        const childSelectCard = page.getByRole('button').filter({ hasText: /Demo Student/i }).first();
        await expect(childSelectCard).toBeVisible({ timeout: 15000 });
        await childSelectCard.click();

        // Verify result in ReportCardScreen
        await expect(page.getByText(/Mathematics/i)).toBeVisible({ timeout: 15000 });
        // Check for 90 score
        await expect(page.getByText('90')).toBeVisible();

        // Logout
        await page.locator('aside').getByRole('button', { name: /Logout/i }).click();

        // --- 4. Student View ---
        await page.getByPlaceholder(/email/i).fill(STUDENT_EMAIL);
        await page.getByPlaceholder(/password/i).fill(PASSWORD);
        await page.getByRole('button', { name: /sign in/i }).click();

        await expect(page.getByText(/Student Dashboard/i)).toBeVisible({ timeout: 20000 });

        // Navigate to Results
        await page.locator('nav').getByRole('button', { name: /Results/i }).click();
        
        // Wait for results
        await page.waitForTimeout(1000); 
        await expect(page.getByText(/Mathematics/i)).toBeVisible({ timeout: 15000 });
        await expect(page.getByText(/90%/)).toBeVisible();

        // View Full Digital Report Card
        await page.getByRole('button', { name: /View Full Digital Report Card/i }).click();

        // Final verification on the official report card
        await expect(page.getByText(/Official Report Card/i)).toBeVisible();
        await expect(page.getByText(/DEMO STUDENT/i)).toBeVisible();
        await expect(page.getByText('90')).toBeVisible(); 
        await expect(page.getByText('A')).toBeVisible();
    });
});
