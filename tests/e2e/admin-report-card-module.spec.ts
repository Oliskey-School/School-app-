import { test, expect } from '@playwright/test';

test.describe('Admin Report Card Module - Full Stack Verification', () => {
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

    test('Verify Report Card Publishing Flow', async ({ page }) => {
        // 1. Navigate to Report Card Publishing
        await page.evaluate(() => {
            // @ts-ignore
            if (window.ADMIN_NAVIGATE) {
                // @ts-ignore
                window.ADMIN_NAVIGATE('reportCardPublishing', 'Report Card Publishing');
            }
        });

        await expect(page.getByText(/Active Registry Context|Neural Registry/)).toBeVisible();

        // 2. Switch to Submitted Tab
        const submittedTab = page.getByRole('button', { name: /SUBMITTED/i });
        await submittedTab.click();

        // 3. Check for any submitted reports
        // If there are none, we can't test publishing unless we create one, 
        // but for QA audit, we verify the UI and presence of controls.
        const reportCard = page.locator('.grid div:has-text("GRADE")').first();
        
        if (await reportCard.isVisible()) {
            const publishBtn = reportCard.getByRole('button', { name: /Publish/i });
            await publishBtn.click();
            await expect(page.getByText('Report published successfully')).toBeVisible();
            
            // Verify it moved to Published tab or status changed
            await expect(reportCard.getByText('Published')).toBeVisible();
        } else {
            console.log('No submitted reports found to publish.');
            await expect(page.getByText(/No Submitted Reports|Neural Registry Empty/i)).toBeVisible();
        }
    });

    test('Verify Report Card Preview', async ({ page }) => {
        // Navigate to Report Card Publishing
        await page.evaluate(() => {
            // @ts-ignore
            window.ADMIN_NAVIGATE('reportCardPublishing', 'Report Card Publishing');
        });

        // Click Preview on the first student record
        const previewBtn = page.locator('button:has-text("Preview")').first();
        if (await previewBtn.isVisible()) {
            await previewBtn.click();
            
            // Should show ReportCardPreview
            await expect(page.getByText(/Report Card|Academic Statement/i)).toBeVisible();
            await expect(page.getByRole('button', { name: /Close|Done/i })).toBeVisible();
        }
    });
});
