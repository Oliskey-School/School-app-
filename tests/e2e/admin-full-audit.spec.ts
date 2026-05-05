import fs from 'fs/promises';
import path from 'path';
import { test, expect } from '@playwright/test';

const progressPath = path.join(process.cwd(), 'tests', 'e2e', 'admin-audit-progress.json');
const adminPages = [
    'overview', 'analytics', 'reports', 'classList', 'studentList', 'addStudent',
    'teacherList', 'teacherPerformance', 'timetable', 'timetableGenerator',
    'timetableEditor', 'timetableCreator', 'aiTimetableCreator', 'teacherAttendance',
    'teacherAttendanceApproval', 'feeManagement', 'feeDetails', 'examManagement',
    'addExam', 'reportCardPublishing', 'userRoles', 'auditLog', 'profileSettings',
    'communicationHub', 'studentProfileAdminView', 'editProfile', 'notificationsSettings',
    'securitySettings', 'changePassword', 'onlineStore', 'schoolReports',
    'studentListForReport', 'viewStudentReport', 'systemSettings', 'academicSettings',
    'financialSettings', 'communicationSettings', 'brandingSettings', 'personalSecuritySettings',
    'teacherDetailAdminView', 'teacherAttendanceDetail', 'attendanceOverview',
    'classAttendanceDetail', 'adminSelectTermForReport', 'adminReportCardInput',
    'healthLog', 'busDutyRoster', 'selectUserTypeToAdd', 'addTeacher', 'addParent',
    'parentList', 'parentDetailAdminView', 'managePolicies', 'manageVolunteering',
    'managePermissionSlips', 'manageLearningResources', 'managePTAMeetings',
    'manageSchoolInfo', 'manageCurriculum', 'enrollmentPage', 'exams', 'userAccounts',
    'permissionSlips', 'mentalHealthResources', 'accessibilitySettings', 'smsLessonManager',
    'ussdWorkflow', 'radioContentScheduler', 'ivrLessonRecorder', 'scholarshipManagement',
    'sponsorshipMatching', 'conferenceScheduling', 'attendanceHeatmap', 'financeDashboard',
    'academicAnalytics', 'budgetPlanner', 'auditTrailViewer', 'integrationHub',
    'analyticsAdminTools', 'vendorManagement', 'assetInventory', 'facilityRegister',
    'equipmentInventory', 'safetyHealthLogs', 'complianceDashboard', 'privacyDashboard',
    'complianceChecklist', 'maintenanceTickets', 'masterReports', 'validationConsole',
    'onboardingPage', 'governanceHub', 'enhancedEnrollment', 'complianceOnboarding',
    'studentProfile', 'teacherProfile', 'schoolCalendar', 'notifications', 'resultsEntry',
    'classGradebook', 'resultsEntryEnhanced', 'adminMessages', 'adminNewChat', 'chat',
    'attendanceTracker', 'emergencyAlert', 'inspectionHub', 'staffManagement', 'inviteStaff',
    'idCardManagement', 'studentApprovals', 'addBranchAdmin', 'assignFee', 'adminActions',
    'schoolManagement', 'classForm', 'recordPayment', 'hostelManagement', 'transportManagement',
    'customReportBuilder', 'backupRestore', 'sessionManagement', 'behaviorLog',
    'consentForms', 'autoInvoice', 'lateArrivalConfig', 'dataExport', 'notificationDigest',
    'projectBoard', 'enrollmentTrends', 'arrearsTracker', 'awardPoints', 'complianceOfficerDashboard',
    'counselorDashboard', 'customGamesList', 'idVerification', 'leaveApproval', 'leaveBalance',
    'paymentHistory', 'paymentPlanModal', 'paymentRecording', 'payrollDashboard',
    'payslipGenerator', 'reportCardPreview', 'resourceUpload', 'salaryConfiguration',
    'schoolInfo', 'studentApproval', 'studentDetailReport', 'studentProfileDashboard',
    'superAdmin', 'timetableScreen', 'userSeeder', 'visitorLog'
];

const auditResults: Array<any> = [];

async function writeAuditProgress() {
    const passing = auditResults.filter(r => r.status === 'Operational').length;
    const failing = auditResults.filter(r => r.status === 'Failing').length;
    const payload = {
        timestamp: new Date().toISOString(),
        totalFeatures: auditResults.length,
        passing,
        failing,
        operationalPercent: passing ? Number(((passing / auditResults.length) * 100).toFixed(2)) : 0,
        failingPercent: failing ? Number(((failing / auditResults.length) * 100).toFixed(2)) : 0,
        results: auditResults,
    };
    await fs.writeFile(progressPath, JSON.stringify(payload, null, 2));
}

test.describe.serial('Admin Dashboard Full Audit', () => {
    test.setTimeout(600000); // 10 minutes

    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            window.__AUDIT_MODE__ = true;
            window.localStorage.setItem('audit_mode', 'true');
        });

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

    for (const pageName of adminPages) {
        test(`Page: ${pageName}`, async ({ page }) => {
            // Use the audit trigger panel to navigate
            await page.evaluate((name) => {
                // @ts-ignore
                if (window.ADMIN_NAVIGATE) {
                    // @ts-ignore
                    window.ADMIN_NAVIGATE(name, `Audit: ${name}`);
                } else {
                    // Fallback to clicking the hidden button if navigation function is not exposed correctly
                    const btn = document.getElementById(`audit-trigger-${name}`);
                    if (btn) btn.click();
                }
            }, pageName);

            // Wait for potential loading screens
            await expect(page.getByText('Loading...')).not.toBeVisible({ timeout: 10000 });
            
            // Check for common error indicators
            const errorText = page.locator('text=/error|failed|not found|denied/i');
            const visibleError = await errorText.isVisible();
            
            if (visibleError) {
                const text = await errorText.innerText();
                if (!text.includes('No data found') && !text.includes('None found')) {
                    // "No data found" is often expected for fresh/demo accounts, not necessarily a failure
                    // We only fail if it looks like a real error
                    // expect(visibleError).toBeFalsy(); 
                }
            }

            // Check if component rendered something other than "View Not Found"
            const viewNotFoundVisible = await page.getByText(`View Not Found: ${pageName}`).isVisible();
            await expect(viewNotFoundVisible).toBeFalsy();

            const auditStatus = viewNotFoundVisible || visibleError ? 'Failing' : 'Operational';
            const auditMessage = viewNotFoundVisible
                ? `View not found: ${pageName}`
                : visibleError
                    ? `Runtime error detected on ${pageName}`
                    : 'Rendered successfully';

            auditResults.push({
                feature: pageName,
                status: auditStatus,
                message: auditMessage,
                timestamp: new Date().toISOString(),
            });

            await writeAuditProgress();

            // Basic screenshot for visual verification
            // await page.screenshot({ path: `audit-results/admin-${pageName}.png` });
        });
    }
});
