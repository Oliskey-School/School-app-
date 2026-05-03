import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard - Comprehensive E2E Testing', () => {
    test.setTimeout(300000);

    const DEMO_CREDENTIALS = {
        email: 'admin@demo.com',
        password: 'password123',
        schoolId: 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1',
        branchId: '7601cbea-e1ba-49d6-b59b-412a584cb94f'
    };

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        await page.getByRole('button', { name: /Try Demo School/ }).click();
        const adminBtn = page.getByRole('button', { name: /Admin/i, exact: false }).first();
        await adminBtn.waitFor({ state: 'visible' });
        await adminBtn.click();
        await expect(page.locator('header h1', { hasText: /Admin Dashboard/i })).toBeVisible({ timeout: 20000 });
    });

    test.describe('Dashboard Overview', () => {
        test('Dashboard loads with header and welcome message', async ({ page }) => {
            await expect(page.locator('header h1', { hasText: /Admin Dashboard/i })).toBeVisible();
            await expect(page.getByText('Welcome, Admin!')).toBeVisible();
        });

        test('Dashboard displays stats cards', async ({ page }) => {
            await expect(page.locator('text=Total Students')).toBeVisible();
            await expect(page.locator('text=Total Staff')).toBeVisible();
            await expect(page.locator('text=Total Parents')).toBeVisible();
            await expect(page.locator('text=Academic Levels')).toBeVisible();
        });

        test('Quick Actions section is visible', async ({ page }) => {
            await expect(page.locator('text=Quick Actions')).toBeVisible();
        });

        test('Stats cards have correct data structure', async ({ page }) => {
            const statsCards = page.locator('[class*="bg-gradient-to-br"][class*="text-white"]');
            await expect(statsCards.first()).toBeVisible();
        });
    });

    test.describe('Student List Navigation', () => {
        test('Navigation to Student List works', async ({ page }) => {
            await page.getByRole('button', { name: /studentList|Students|Manage Students/i }).first().click();
            await page.waitForTimeout(2000);
            await expect(page.locator('header h1', { hasText: /Students|Manage Students/i })).toBeVisible({ timeout: 10000 });
        });

        test('Student List page title is correct', async ({ page }) => {
            await page.getByRole('button', { name: /studentList|Students|Manage Students/i }).first().click();
            await page.waitForTimeout(2000);
            const header = page.locator('header h1');
            await expect(header).toContainText(/Students|Manage Students/i);
        });

        test('Search input is visible in Student List', async ({ page }) => {
            await page.getByRole('button', { name: /studentList|Students|Manage Students/i }).first().click();
            await page.waitForTimeout(2000);
            await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
        });

        test('View mode toggle is present in Student List', async ({ page }) => {
            await page.getByRole('button', { name: /studentList|Students|Manage Students/i }).first().click();
            await page.waitForTimeout(2000);
            await expect(page.getByRole('button', { name: /By Stage|By Class/i })).toBeVisible();
        });

        test('Add Student button is visible', async ({ page }) => {
            await page.getByRole('button', { name: /studentList|Students|Manage Students/i }).first().click();
            await page.waitForTimeout(2000);
            await expect(page.locator('[aria-label*="Add new student"]')).toBeVisible();
        });
    });

    test.describe('Teacher List Navigation', () => {
        test('Navigation to Teacher List works', async ({ page }) => {
            await page.getByRole('button', { name: /teacherList|Teachers|Manage Teachers/i }).first().click();
            await page.waitForTimeout(2000);
            await expect(page.locator('header h1', { hasText: /Teacher|Staff/i })).toBeVisible({ timeout: 10000 });
        });

        test('Teacher List page title is correct', async ({ page }) => {
            await page.getByRole('button', { name: /teacherList|Teachers|Manage Teachers/i }).first().click();
            await page.waitForTimeout(2000);
            const header = page.locator('header h1');
            await expect(header).toContainText(/Teacher|Staff|Management/i);
        });

        test('Stats overview is visible in Teacher List', async ({ page }) => {
            await page.getByRole('button', { name: /teacherList|Teachers|Manage Teachers/i }).first().click();
            await page.waitForTimeout(2000);
            await expect(page.locator('text=Total Teachers')).toBeVisible();
            await expect(page.locator('text=Active Faculty')).toBeVisible();
        });

        test('Search and filter controls are present', async ({ page }) => {
            await page.getByRole('button', { name: /teacherList|Teachers|Manage Teachers/i }).first().click();
            await page.waitForTimeout(2000);
            await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
        });

        test('Add Teacher button is visible', async ({ page }) => {
            await page.getByRole('button', { name: /teacherList|Teachers|Manage Teachers/i }).first().click();
            await page.waitForTimeout(2000);
            await expect(page.getByRole('button', { name: /Add Teacher/i })).toBeVisible();
        });
    });

    test.describe('Class List Navigation', () => {
        test('Navigation to Class List works', async ({ page }) => {
            await page.getByRole('button', { name: /classList|Classes|Manage Classes/i }).first().click();
            await page.waitForTimeout(2000);
            await expect(page.locator('header h1', { hasText: /Classes|Class/i })).toBeVisible({ timeout: 10000 });
        });

        test('Class List page title is correct', async ({ page }) => {
            await page.getByRole('button', { name: /classList|Classes|Manage Classes/i }).first().click();
            await page.waitForTimeout(2000);
            const header = page.locator('header h1');
            await expect(header).toContainText(/Classes|Class/i);
        });

        test('Academic levels are displayed', async ({ page }) => {
            await page.getByRole('button', { name: /classList|Classes|Manage Classes/i }).first().click();
            await page.waitForTimeout(2000);
            await expect(page.locator('text=Academic Levels')).toBeVisible();
        });

        test('Add Class button is visible', async ({ page }) => {
            await page.getByRole('button', { name: /classList|Classes|Manage Classes/i }).first().click();
            await page.waitForTimeout(2000);
            await expect(page.getByRole('button', { name: /Add Class/i })).toBeVisible();
        });
    });

    test.describe('Parent List Navigation', () => {
        test('Navigation to Parent List works', async ({ page }) => {
            await page.getByRole('button', { name: /parentList|Parents|Manage Parents/i }).first().click();
            await page.waitForTimeout(2000);
            await expect(page.locator('header h1', { hasText: /Parents|Parent/i })).toBeVisible({ timeout: 10000 });
        });

        test('Parent List page title is correct', async ({ page }) => {
            await page.getByRole('button', { name: /parentList|Parents|Manage Parents/i }).first().click();
            await page.waitForTimeout(2000);
            const header = page.locator('header h1');
            await expect(header).toContainText(/Parents|Parent/i);
        });

        test('Parent search input is visible', async ({ page }) => {
            await page.getByRole('button', { name: /parentList|Parents|Manage Parents/i }).first().click();
            await page.waitForTimeout(2000);
            await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
        });

        test('Add Parent button is visible', async ({ page }) => {
            await page.getByRole('button', { name: /parentList|Parents|Manage Parents/i }).first().click();
            await page.waitForTimeout(2000);
            await expect(page.locator('[aria-label*="Add new parent"]')).toBeVisible();
        });
    });

    test.describe('Fee Management Navigation', () => {
        test('Navigation to Fee Management works', async ({ page }) => {
            await page.getByRole('button', { name: /feeManagement|Fee Management/i }).first().click();
            await page.waitForTimeout(2000);
            await expect(page.locator('header h1', { hasText: /Fee/i })).toBeVisible({ timeout: 10000 });
        });

        test('Fee Management page title is correct', async ({ page }) => {
            await page.getByRole('button', { name: /feeManagement|Fee Management/i }).first().click();
            await page.waitForTimeout(2000);
            const header = page.locator('header h1');
            await expect(header).toContainText(/Fee/i);
        });

        test('Stats overview is visible in Fee Management', async ({ page }) => {
            await page.getByRole('button', { name: /feeManagement|Fee Management/i }).first().click();
            await page.waitForTimeout(2000);
            await expect(page.locator('text=Total Expected')).toBeVisible();
            await expect(page.locator('text=Total Collected')).toBeVisible();
            await expect(page.locator('text=Outstanding')).toBeVisible();
        });

        test('Fee table headers are present', async ({ page }) => {
            await page.getByRole('button', { name: /feeManagement|Fee Management/i }).first().click();
            await page.waitForTimeout(2000);
            await expect(page.locator('text=Student')).toBeVisible();
            await expect(page.locator('text=Fee Info')).toBeVisible();
            await expect(page.locator('text=Amount')).toBeVisible();
            await expect(page.locator('text=Status')).toBeVisible();
        });
    });

    test.describe('Exam Management Navigation', () => {
        test('Navigation to Exam Management works', async ({ page }) => {
            await page.getByRole('button', { name: /examManagement|Exams|Exam/i }).first().click();
            await page.waitForTimeout(2000);
            await expect(page.locator('header h1', { hasText: /Exam/i })).toBeVisible({ timeout: 10000 });
        });

        test('Exam Management page title is correct', async ({ page }) => {
            await page.getByRole('button', { name: /examManagement|Exams|Exam/i }).first().click();
            await page.waitForTimeout(2000);
            const header = page.locator('header h1');
            await expect(header).toContainText(/Exam/i);
        });

        test('Filter controls are present in Exam Management', async ({ page }) => {
            await page.getByRole('button', { name: /examManagement|Exams|Exam/i }).first().click();
            await page.waitForTimeout(2000);
            await expect(page.locator('label', { hasText: /Teacher/i })).toBeVisible();
            await expect(page.locator('label', { hasText: /Curriculum/i })).toBeVisible();
        });
    });

    test.describe('Analytics Navigation', () => {
        test('Navigation to Analytics works', async ({ page }) => {
            await page.getByRole('button', { name: /analytics|Analytics|School Analytics/i }).first().click();
            await page.waitForTimeout(2000);
            await expect(page.locator('text=Student Performance')).toBeVisible({ timeout: 10000 });
        });

        test('Analytics page displays all sections', async ({ page }) => {
            await page.getByRole('button', { name: /analytics|Analytics|School Analytics/i }).first().click();
            await page.waitForTimeout(2000);
            await expect(page.locator('text=Student Performance')).toBeVisible();
            await expect(page.locator('text=Fee Compliance')).toBeVisible();
            await expect(page.locator('text=Teacher Workload')).toBeVisible();
            await expect(page.locator('text=Attendance Trend')).toBeVisible();
            await expect(page.locator('text=Enrollment Trends')).toBeVisible();
        });
    });

    test.describe('Reports Navigation', () => {
        test('Navigation to Reports works', async ({ page }) => {
            await page.getByRole('button', { name: /reports|Reports/i }).first().click();
            await page.waitForTimeout(2000);
            await expect(page.locator('text=/Average Grades|Top Performing|Attendance-Performance/i')).toBeVisible({ timeout: 10000 });
        });

        test('Reports page displays all sections', async ({ page }) => {
            await page.getByRole('button', { name: /reports|Reports/i }).first().click();
            await page.waitForTimeout(2000);
            await expect(page.locator('text=Average Grades by Subject')).toBeVisible();
            await expect(page.locator('text=Top Performing Students')).toBeVisible();
            await expect(page.locator('text=Attendance-Performance Trend')).toBeVisible();
        });
    });

    test.describe('Navigation Between Views', () => {
        test('Can navigate back to Dashboard from Student List', async ({ page }) => {
            await page.getByRole('button', { name: /studentList|Students|Manage Students/i }).first().click();
            await page.waitForTimeout(2000);
            await expect(page.locator('header h1', { hasText: /Students|Manage Students/i })).toBeVisible();
            await page.getByRole('button', { name: /home|Home/i }).first().click();
            await page.waitForTimeout(2000);
            await expect(page.locator('header h1', { hasText: /Admin Dashboard/i })).toBeVisible();
        });

        test('Can navigate between multiple views in sequence', async ({ page }) => {
            await page.getByRole('button', { name: /Student/i }).first().click();
            await page.waitForTimeout(1000);
            await page.getByRole('button', { name: /Teacher/i }).first().click();
            await page.waitForTimeout(1000);
            await page.getByRole('button', { name: /Class/i }).first().click();
            await page.waitForTimeout(1000);
            await expect(page.locator('header h1', { hasText: /Classes|Class/i })).toBeVisible();
        });
    });

    test.describe('Error Handling for Invalid Routes', () => {
        test('Invalid view shows View Not Found message', async ({ page }) => {
            await page.evaluate(() => {
                sessionStorage.setItem('admin_viewStack', JSON.stringify([{ view: 'invalidView', title: 'Invalid' }]));
            });
            await page.reload();
            await page.waitForTimeout(2000);
            await expect(page.locator('text=View Not Found')).toBeVisible();
        });
    });

    test.describe('Data Loading and Display', () => {
        test('Dashboard stats load without error', async ({ page }) => {
            await expect(page.locator('text=Total Students')).toBeVisible({ timeout: 15000 });
        });

        test('Student List displays data structure correctly', async ({ page }) => {
            await page.getByRole('button', { name: /studentList|Students|Manage Students/i }).first().click();
            await page.waitForTimeout(3000);
            await expect(page.locator('header h1')).toBeVisible();
        });

        test('Teacher List displays data structure correctly', async ({ page }) => {
            await page.getByRole('button', { name: /teacherList|Teachers|Manage Teachers/i }).first().click();
            await page.waitForTimeout(3000);
            await expect(page.locator('header h1')).toBeVisible();
        });

        test('Fee Management displays financial data', async ({ page }) => {
            await page.getByRole('button', { name: /feeManagement|Fee Management/i }).first().click();
            await page.waitForTimeout(3000);
            await expect(page.locator('text=Total Expected')).toBeVisible();
        });
    });
});
