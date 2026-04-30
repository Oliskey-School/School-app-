import { test, expect } from '@playwright/test';

test.describe('Admin Fee Module - Full Stack Verification', () => {
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

    test('Verify Fee Assignment and Payment Flow', async ({ page }) => {
        // 1. Navigate to Fee Management
        await page.evaluate(() => {
            // @ts-ignore
            if (window.ADMIN_NAVIGATE) {
                // @ts-ignore
                window.ADMIN_NAVIGATE('feeManagement', 'Fee Management');
            }
        });

        await expect(page.getByText('Total Expected')).toBeVisible();

        // 2. Click Assign Fee
        const assignBtn = page.getByRole('button', { name: /Assign Fee/i });
        await assignBtn.click();

        // Check if it navigated to assignFee screen
        await expect(page.getByText(/Title|Amount/)).toBeVisible();

        // 3. Fill Fee Information
        const testTitle = `QA_Fee_${Date.now()}`;
        await page.fill('input[name="title"], input[placeholder*="Title"]', testTitle);
        await page.fill('input[name="amount"], input[type="number"]', '50000');
        
        // Date picker
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const dateStr = nextMonth.toISOString().split('T')[0];
        await page.fill('input[type="date"]', dateStr);

        // Select a student
        // Search for a student in the dropdown
        const studentSelect = page.locator('select[name="studentId"], #studentId');
        if (await studentSelect.isVisible()) {
            await studentSelect.selectOption({ index: 1 }); // Select second option (first is usually placeholder)
        }

        // 4. Submit Form
        await page.click('button[type="submit"]');

        // 5. Verify success and check in list
        await expect(page.getByText('Fee Assigned Successfully|Fee created successfully')).toBeVisible();
        await expect(page.getByText(testTitle)).toBeVisible();

        // 6. Test Record Payment functionality
        // Find the record payment button for this specific fee
        const feeRow = page.locator(`tr:has-text("${testTitle}")`);
        const paymentBtn = feeRow.locator('button[title="Record Payment"]');
        
        if (await paymentBtn.isVisible()) {
            await paymentBtn.click();
            
            // Should show RecordPaymentScreen
            await expect(page.getByText(/Amount to Pay|Payment Method/i)).toBeVisible();
            await page.fill('input[type="number"]', '10000'); // Partial payment
            await page.click('button:has-text("Record"), button:has-text("Save")');
            
            await expect(page.getByText('Payment recorded successfully')).toBeVisible();
            await expect(feeRow.getByText('Partial')).toBeVisible();
        }
    });
});
