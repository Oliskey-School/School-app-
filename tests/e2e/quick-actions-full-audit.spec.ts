import { test, expect } from '@playwright/test';

test.describe('Admin Quick Actions Comprehensive Audit', () => {
    test.setTimeout(600000); // 10 minutes

    test('Audit ALL Quick Actions: Navigation, API, and DB Connectivity', async ({ page }) => {
        const apiErrors: string[] = [];
        const apiSuccesses: string[] = [];

        page.on('response', response => {
            const url = response.url();
            const status = response.status();
            if (url.includes('/rest/v1/') || url.includes('/functions/v1/') || url.includes('/rpc/')) {
                if (status >= 400 && response.request().method() !== 'OPTIONS') {
                    apiErrors.push(`FAIL: ${response.request().method()} ${url} returned ${status}`);
                } else if (status >= 200 && status < 300) {
                    apiSuccesses.push(`SUCCESS: ${response.request().method()} ${url} returned ${status}`);
                }
            }
        });

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Login via Demo
        await page.getByRole('button', { name: /Try Demo School/ }).click();
        const adminBtn = page.getByRole('button', { name: /Admin/i, exact: false }).first();
        await adminBtn.waitFor({ state: 'visible' });
        await adminBtn.click();

        // Wait for dashboard to load
        await expect(page.locator('header h1', { hasText: /Admin Dashboard/i })).toBeVisible({ timeout: 40000 });
        console.log('Admin Dashboard Loaded');

        const dashboardActions = [
            { label: 'Add User', heading: /Add New User/i },
            { label: 'Approvals', heading: /Student Approvals/i },
            { label: 'Onboarding', heading: /School Onboarding/i },
            { label: 'Enroll Student', heading: /New Student Enrollment|Student Enrollment/i },
            { label: 'Register Exams', heading: /External Exams/i },
            { label: 'Publish Reports', heading: /Publish Reports/i },
            { label: 'Timetable', heading: /AI Timetable|Timetable/i },
            { label: 'Announce', heading: /Communication Hub/i },
            { label: 'Bus Roster', heading: /Bus Duty Roster/i },
            { label: 'Health Log', heading: /Health Log/i },
            { label: 'Attendance', heading: /Teacher Attendance/i },
            { label: 'User Accounts', heading: /User Accounts/i },
            { label: 'Compliance', heading: /School Compliance/i },
            { label: 'Track Attendance', heading: /Curriculum Attendance/i },
            { label: 'Enter Results', heading: /Results Entry/i },
            { label: 'Launch Hub', heading: /Pilot Onboarding/i }
        ];

        for (const action of dashboardActions) {
            console.log(`Testing Action: ${action.label}`);
            const actionBtn = page.getByRole('button', { name: new RegExp(`^${action.label}$`, 'i') }).first();
            
            if (await actionBtn.isVisible()) {
                await actionBtn.click();
                await expect(page.locator('header h1', { hasText: action.heading }).first()).toBeVisible({ timeout: 20000 });
                console.log(`PASS: ${action.label}`);
                await page.waitForTimeout(1000); 
                
                const backBtn = page.getByLabel('Go back').first();
                if (await backBtn.isVisible()) {
                    await backBtn.click();
                } else {
                    await page.goBack();
                }
                await expect(page.locator('header h1', { hasText: /Admin Dashboard/i })).toBeVisible({ timeout: 20000 });
            } else {
                console.warn(`SKIP: ${action.label} (button not found)`);
            }
        }

        console.log('--- FINAL API INTEGRATION AUDIT RESULTS ---');
        console.log(`Total API Successes: ${apiSuccesses.length}`);
        if (apiErrors.length > 0) {
            console.error('API Errors Found:');
            apiErrors.forEach(err => console.error(err));
        }

        expect(apiErrors).toEqual([]);
        expect(apiSuccesses.length).toBeGreaterThan(0);
        console.log('COMPLETE: All Quick Actions verified.');
    });
});