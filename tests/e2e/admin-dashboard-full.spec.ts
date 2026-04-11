import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard Comprehensive Testing', () => {

    test.setTimeout(300000); // 5 minutes for the single long test
    test.use({ viewport: { width: 390, height: 844 }, isMobile: true });

    test('Dashboard: All Actions', async ({ page }) => {
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
        await expect(page.getByText('Welcome, Admin!')).toBeVisible({ timeout: 20000 });

        const allActions = [
            // General
            { label: 'Add User', heading: /Add New User/i },
            { label: 'Approvals', heading: /Student Approvals/i },
            { label: 'Onboarding', heading: /School Onboarding/i },
            { label: 'Enroll Student', heading: /New Student Enrollment/i },
            { label: 'Publish Reports', heading: /Publish Reports/i },
            { label: 'Timetable', heading: /Timetable/i },
            { label: 'Bus Roster', heading: /Bus Duty Roster/i },
            { label: 'Health Log', heading: /Health Log/i },
            { label: 'Attendance', heading: /Teacher Attendance/i },
            { label: 'User Accounts', heading: /User Accounts/i },
            { label: 'Compliance', heading: /School Compliance/i },
            { label: 'Track Attendance', heading: /Curriculum Attendance/i },
            { label: 'Launch Hub', heading: /Pilot Onboarding/i },
            
            // Content
            { label: 'School Policies', heading: /Manage Policies/i },
            { label: 'Volunteering', heading: /Volunteering/i },
            { label: 'Permission Slips', heading: /Permission Slips/i },
            { label: 'Learning Resources', heading: /Learning Resources/i },
            { label: 'PTA Meetings', heading: /PTA Meetings/i },
            { label: 'External Exams', heading: /External Exams/i },
            { label: 'Enrollment', heading: /Student Enrollment/i },
            { label: 'Curriculum', heading: /Curriculum/i },
            { label: 'Facility Register', heading: /Facility Register/i },
            { label: 'Asset Inventory', heading: /Equipment Inventory/i },

            // Transport, Data, Safety
            { label: 'Hostel Management', heading: /Hostel & Boarding/i },
            { label: 'Transport Mgmt', heading: /Transport Management/i },
            { label: 'Behavior Tracking', heading: /Behavior/i },
            { label: 'Custom Reports', heading: /Custom Report/i },
            { label: 'Backup & Restore', heading: /Data Backup/i },
            { label: 'Active Sessions', heading: /Session Management/i },
            { label: 'Auto Invoices', heading: /Auto Invoice/i },
            { label: 'Late Arrivals', heading: /Late Arrival/i },
            { label: 'Enrollment Trends', heading: /Enrollment Trends/i },
            { label: 'Consent Forms', heading: /Parental Consent/i },
            { label: 'Data Export', heading: /Data Export/i },
            { label: 'Notification Settings', heading: /Notification Digest/i },
            { label: 'Project Boards', heading: /Kanban/i },
            { label: 'Emergency Alerts', heading: /Emergency Alert/i },
            { label: 'Health & Incidents', heading: /Safety & Health/i },

            // Governance
            { label: 'Quality Assurance', heading: /Inspection Hub/i },
            { label: 'Ministry Reports', heading: /Inspection Hub/i },
            { label: 'Live Compliance', heading: /Compliance Dashboard/i },
            { label: 'Governance Hub', heading: /Unified Governance/i },
            { label: 'System Validation', heading: /Validation Console/i }
        ];

        for (const action of allActions) {
            await page.locator('main, div.flex-grow').getByRole('button', { name: new RegExp(`^${action.label}$`, 'i') }).first().click();
            await expect(page.locator('header h1', { hasText: action.heading }).first()).toBeVisible({ timeout: 15000 });
            await page.getByLabel('Go back').click();
            await expect(page.locator('header h1', { hasText: /Admin Dashboard/i })).toBeVisible();
        }

        // Navigation
        const bottomNav = page.locator('nav.fixed.bottom-0');
        
        await bottomNav.locator('button', { hasText: /^Fees$/ }).click();
        await expect(page.locator('header h1', { hasText: /Fee Management/i })).toBeVisible();

        await bottomNav.locator('button', { hasText: /^Analytics$/ }).click();
        await expect(page.locator('header h1', { hasText: /School Analytics/i })).toBeVisible();

        await bottomNav.locator('button', { hasText: /^Messages$/ }).click();
        await expect(page.locator('header h1', { hasText: /^Messages Dashboard$/i })).toBeVisible();

        await bottomNav.locator('button', { hasText: /^Settings$/ }).click();
        await expect(page.locator('header h1', { hasText: /System Settings/i })).toBeVisible();
    });
});
