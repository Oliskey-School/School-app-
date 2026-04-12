import { test, expect } from '@playwright/test';

const pages = [
  { view: 'overview', title: 'Admin Dashboard' },
  { view: 'analytics', title: 'School Analytics' },
  { view: 'reports', title: 'Reports' },
  { view: 'classList', title: 'Classes' },
  { view: 'studentList', title: 'Students' },
  { view: 'addStudent', title: 'Add Student' },
  { view: 'teacherList', title: 'Teachers' },
  { view: 'teacherPerformance', title: 'Teacher Performance' },
  { view: 'timetable', title: 'Timetable' },
  { view: 'timetableGenerator', title: 'Timetable Generator' },
  { view: 'timetableEditor', title: 'Timetable Editor' },
  { view: 'timetableCreator', title: 'Timetable Creator' },
  { view: 'aiTimetableCreator', title: 'AI Timetable Creator' },
  { view: 'teacherAttendance', title: 'Teacher Attendance' },
  { view: 'teacherAttendanceApproval', title: 'Teacher Attendance Approval' },
  { view: 'feeManagement', title: 'Fee Management' },
  { view: 'feeDetails', title: 'Fee Details' },
  { view: 'examManagement', title: 'Exam Management' },
  { view: 'addExam', title: 'Add Exam' },
  { view: 'reportCardPublishing', title: 'Report Card Publishing' },
];

test.describe('Admin Dashboard 20 Pages Audit', () => {
  test.beforeEach(async ({ page }) => {
    // Set audit mode to skip initialization delays
    await page.addInitScript(() => {
      window.localStorage.setItem('audit_mode', 'true');
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Login via Demo
    const demoBtn = page.getByRole('button', { name: /Try Demo School/ });
    if (await demoBtn.isVisible()) {
      await demoBtn.click();
    }

    const adminBtn = page.getByRole('button', { name: /Admin/i, exact: false }).first();
    await adminBtn.waitFor({ state: 'visible' });
    await adminBtn.click();

    // Wait for dashboard to load
    await expect(page.locator('header h1', { hasText: /Admin Dashboard/i })).toBeVisible({ timeout: 30000 });
  });

  for (const p of pages) {
    test(`Page: ${p.view}`, async ({ page }) => {
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text());
      });

      const responseErrors: number[] = [];
      page.on('response', response => {
        if (response.status() >= 500) {
          responseErrors.push(response.status());
        }
      });

      console.log(`Navigating to ${p.view}...`);
      await page.evaluate((view) => {
        if (window.ADMIN_NAVIGATE) {
          window.ADMIN_NAVIGATE(view, `Audit: ${view}`);
        } else {
          throw new Error('ADMIN_NAVIGATE not found');
        }
      }, p.view);

      // Check Frontend
      // Some pages might take time to load
      await page.waitForTimeout(2000);
      
      const viewNotFound = page.getByText(`View Not Found: ${p.view}`);
      const errorBoundary = page.getByText(/We encountered an issue while rendering this screen/);
      
      const frontendPass = !(await viewNotFound.isVisible()) && !(await errorBoundary.isVisible());
      expect(frontendPass, `Frontend failed for ${p.view}`).toBe(true);

      // Check Backend API
      expect(responseErrors.length, `Backend API failed for ${p.view} with status codes: ${responseErrors.join(', ')}`).toBe(0);

      // Specific Database Checks
      if (p.view === 'addStudent') {
        console.log('Testing Database for addStudent...');
        await page.fill('input[name="fullName"]', 'Test Student');
        await page.selectOption('select[id="gender"]', 'Male');
        await page.fill('input[name="birthday"]', '2010-01-01');
        
        // Select first class if available
        const checkboxes = page.locator('input[type="checkbox"]');
        if (await checkboxes.count() > 0) {
          await checkboxes.first().check();
        }

        // Intercept enrollment request
        const enrollmentPromise = page.waitForResponse(response => 
          response.url().includes('/api/enrollments') && response.request().method() === 'POST',
          { timeout: 10000 }
        );

        await page.click('button[type="submit"]');
        
        const enrollmentResponse = await enrollmentPromise;
        expect(enrollmentResponse.status(), 'Database (Enrollment API) failed for addStudent').toBeLessThan(400);
        console.log('Database check passed for addStudent');
      }

      if (p.view === 'addExam') {
        console.log('Testing Database for addExam...');
        await page.selectOption('select[id="examType"]', 'Mid-term');
        await page.fill('input[id="date"]', '2024-12-01');
        
        // Wait for classes and subjects to load
        await page.waitForTimeout(2000);

        const classSelect = page.locator('select[id="className"]');
        const subjectSelect = page.locator('select[id="subject"]');

        if (await classSelect.count() > 0 && await (classSelect.locator('option').count()) > 1) {
           await classSelect.selectOption({ index: 1 });
        }
        if (await subjectSelect.count() > 0 && await (subjectSelect.locator('option').count()) > 1) {
           await subjectSelect.selectOption({ index: 1 });
        }

        // Intercept exam save request
        const examPromise = page.waitForResponse(response => 
          response.url().includes('/api/exams') && response.request().method() === 'POST',
          { timeout: 10000 }
        );

        await page.click('button[type="submit"]');
        
        const examResponse = await examPromise;
        expect(examResponse.status(), 'Database (Exam API) failed for addExam').toBeLessThan(400);
        console.log('Database check passed for addExam');
      }
    });
  }
});
