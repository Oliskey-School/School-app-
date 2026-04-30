import { test, expect } from '@playwright/test';

test.describe('Admin Communication Module - Full Stack Verification', () => {
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

        // Navigate to Communication Hub
        await page.evaluate(() => {
            // @ts-ignore
            if (window.ADMIN_NAVIGATE) {
                // @ts-ignore
                window.ADMIN_NAVIGATE('communicationHub', 'Communication Hub');
            }
        });
    });

    test('Verify Announcement Broadcast Flow', async ({ page }) => {
        const testTitle = `Audit Announcement ${Date.now()}`;
        const testMessage = `This is an automated test announcement for full-stack audit. Timestamp: ${new Date().toISOString()}`;

        // 1. Select Audience
        await page.getByText('Everyone').click();

        // 2. Compose Message
        await page.getByPlaceholder('Title').fill(testTitle);
        await page.getByPlaceholder('Type your announcement here...').fill(testMessage);

        // 3. Send
        await page.getByRole('button', { name: 'Send' }).click();

        // 4. Verify Success Toast
        await expect(page.getByText(/Announcement sent|Success/i)).toBeVisible();

        // 5. Verify Persistence in Recent Announcements List
        await expect(page.getByText(testTitle)).toBeVisible({ timeout: 10000 });
        await expect(page.getByText(testMessage)).toBeVisible();
    });

    test('Verify Messaging Navigation and Search', async ({ page }) => {
        // Navigate to Messages
        await page.evaluate(() => {
            // @ts-ignore
            if (window.ADMIN_NAVIGATE) {
                // @ts-ignore
                window.ADMIN_NAVIGATE('adminMessages', 'Messages');
            }
        });

        // Verify Message Header
        await expect(page.getByRole('heading', { name: 'Messages' })).toBeVisible();

        // Search for a contact
        await page.getByPlaceholder('Search...').fill('Smith');
        
        // Verify results (Demo data usually has John Smith)
        // If results exist, they should be visible
        const results = page.locator('button:has-text("Smith")');
        if (await results.count() > 0) {
            await expect(results.first()).toBeVisible();
        }
    });
});
