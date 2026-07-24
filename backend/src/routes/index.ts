import { Router } from 'express';
import authRoutes from './auth.routes';
import translateRoutes from './translate.routes';
import onboardingRoutes from './onboarding.routes';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import {
    getSchoolDocuments, getExternalIntegrations, getThirdPartyApps, getAppInstallations,
    updateExternalIntegration, syncExternalIntegration, installApp, uninstallApp,
    getTeacherSalaries, createTeacherSalary, updateTeacherSalary, getBudgets, createBudget, getPtaMeetings, createPtaMeeting, deletePtaMeeting, getAccessibilitySettings,
    getPayslips, getPaymentTransactions, createPaymentTransaction, updatePayslipStatus, getLeaveRequestsTop, getEmptyList, getArrears
} from '../controllers/misc.controller';
import { getVerificationRequests, reviewVerificationRequest } from '../controllers/idVerification.controller';
import { getComplianceChecks, runComplianceChecks } from '../controllers/compliance.controller';
import { getActiveBranchId } from '../controllers/auth.controller';
import globalForumRoutes from './globalForum.routes';
import userRoutes from './user.routes';
import schoolRoutes from './school.routes';
import inviteRoutes from './invite.routes';
import studentRoutes from './student.routes';
import teacherRoutes from './teacher.routes';
import subscriptionRoutes from './subscription.routes';
import feeRoutes from './fee.routes';
import busRoutes from './bus.routes';
import dashboardRoutes from './dashboard.routes';
import classRoutes from './class.routes';
import parentRoutes from './parent.routes';
import noticeRoutes from './notice.routes';
import attendanceRoutes from './attendance.routes';
import notificationRoutes from './notification.routes';
import reportCardRoutes from './reportCard.routes';
import assignmentRoutes from './assignment.routes';
import examRoutes from './exam.routes';
import lessonPlanRoutes from './lessonPlan.routes';
import forumRoutes from './forum.routes';
import transactionRoutes from './transaction.routes';
import timetableRoutes from './timetable.routes';
import classroomRoutes from './classroom.routes';
import personnelRoutes from './personnel.routes';
import alumniRoutes from './alumni.routes';
import suspensionRoutes from './suspension.routes';
import teacherAssignmentRoutes from './teacherAssignment.routes';
import sopRoutes from './sop.routes';
import substituteRoutes from './substitute.routes';
import riskRoutes from './risk.routes';
import timelineRoutes from './timeline.routes';
import observationRoutes from './observation.routes';
import departureRoutes from './departure.routes';
import departmentRoutes from './department.routes';
import digitalTwinRoutes from './digitalTwin.routes';
import insightRoutes from './insight.routes';
import quizRoutes from './quiz.routes';
import virtualClassRoutes from './virtual-class.routes';
import academicRoutes from './academic.routes';
import resourceRoutes from './resource.routes';
import externalExamRoutes from './externalExam.routes';
import studentReportRoutes from './studentReport.routes';
import aiRoutes from './ai.routes';
import branchRoutes from './branch.routes';
import subjectRoutes from './subject.routes';
import mediaRoutes from './media.routes';
import emergencyRoutes from './emergency.routes';
import galleryRoutes from './gallery.routes';
import calendarRoutes from './calendar.routes';
import auditRoutes from './audit.routes';
import governanceRoutes from './governance.routes';
import healthRoutes from './health.routes';
import payrollRoutes from './payroll.routes';
import communityRoutes from './community.routes';
import verificationRoutes from './verification.routes';
import parentAuthRoutes from './parentAuth.routes';
import extracurricularRoutes from './extracurricular.routes';
import hostelRoutes from './hostel.routes';
import transportRoutes from './transport.routes';
import chatRoutes from './chat.routes';
import parentChatPermissionRoutes from './parentChatPermission.routes';
import planRoutes from './plan.routes';
import anonymousReportRoutes from './anonymousReport.routes';
import gameRoutes from './game.routes';
import pdRoutes from './pd.routes';
import inspectionRoutes from './inspection.routes';
import policyRoutes from './policy.routes';
import infrastructureRoutes from './infrastructure.routes';
import behaviorRoutes from './behavior.routes';
import adminHubRoutes from './admin-hub.routes';
import analyticsRoutes from './analytics.routes';
import saasAnalyticsRoutes from './saas-analytics.routes';
import conferenceRoutes from './conference.routes';
import counselingRoutes from './counseling.routes';
import maintenanceRoutes from './maintenance.routes';
import debugRoutes from './debug.routes';
import paymentPlanRoutes from './paymentPlan.routes';
import versionRoutes from './version.routes';
import idCardRoutes from './idCard.routes';
import storeRoutes from './store.routes';
import vendorRoutes from './vendor.routes';
import offlineChannelRoutes from './offline-channel.routes';
import pwaRoutes from './pwa.routes';
import supportRoutes from './support.routes';
import * as QuizController from '../controllers/quiz.controller';
import * as ParentController from '../controllers/parent.controller';
import { getStudentFeesLegacy } from '../controllers/fee.controller';
import leaveBalanceRoutes from './leaveBalance.routes';
import scholarshipRoutes, { applicationRouter as scholarshipApplicationRoutes, recipientRouter as scholarshipRecipientRoutes } from './scholarship.routes';
import sponsorshipRoutes, { requestRouter as sponsorshipRequestRoutes } from './sponsorship.routes';

const router = Router();

// Public health check for the API prefix
router.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'School SaaS API' });
});

// Branch-aware Global ID for the active branch. Mounted OUTSIDE '/auth' on purpose:
// the API client strips the X-Branch-Id header from all '/auth/*' calls, which would
// make this always resolve to the home branch.
router.get('/active-branch-id', authenticate, getActiveBranchId);

// Public whole-app translation endpoint (no auth — login/demo screens use it).
router.use('/translate', translateRoutes);

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/schools', schoolRoutes);
router.use('/students', studentRoutes);
router.use('/teachers', teacherRoutes);
router.use('/fees', feeRoutes);
router.get('/student-fees', authenticate, getStudentFeesLegacy);
router.use('/buses', busRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/classes', classRoutes);
router.use('/subjects', subjectRoutes);
router.use('/parents', parentRoutes);
router.use('/pta', parentRoutes);
router.use('/volunteering', parentRoutes);
router.use('/notices', noticeRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/notifications', (req, res, next) => {
    console.log(`🔔 [Index] Notification route hit: ${req.method} ${req.url}`);
    next();
}, notificationRoutes);
router.use('/report-cards', reportCardRoutes);
router.use('/assignments', assignmentRoutes);
router.use('/exams', examRoutes);
router.use('/quizzes', quizRoutes);
router.use('/lesson-plans', lessonPlanRoutes);
router.use('/forum', forumRoutes);
router.use('/global-forum', globalForumRoutes);
router.use('/transactions', transactionRoutes);
router.use('/timetables', timetableRoutes);
router.use('/classrooms', classroomRoutes);
router.use('/personnel', personnelRoutes);
router.use('/alumni', alumniRoutes);
router.use('/suspensions', suspensionRoutes);
router.use('/teacher-assignments', teacherAssignmentRoutes);
router.use('/sop', sopRoutes);
router.use('/substitutes', substituteRoutes);
router.use('/risk', riskRoutes);
router.use('/timeline', timelineRoutes);
router.use('/observations', observationRoutes);
router.use('/departures', departureRoutes);
router.use('/departments', departmentRoutes);
router.use('/digital-twin', digitalTwinRoutes);
router.use('/insights', insightRoutes);
router.use('/virtual-classes', virtualClassRoutes);
router.use('/academic', academicRoutes);
router.use('/external-exams', externalExamRoutes);
router.use('/resources', resourceRoutes);
router.use('/student-reports', studentReportRoutes);
router.use('/ai', aiRoutes);
router.use('/branches', branchRoutes);
router.use('/media', mediaRoutes);
router.use('/emergency', emergencyRoutes);
router.use('/gallery', galleryRoutes);
router.use('/calendar', calendarRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/governance', governanceRoutes);
router.use('/health-logs', healthRoutes);
router.use('/payroll', payrollRoutes);
router.use('/community', communityRoutes);
router.use('/verification', verificationRoutes);
router.use('/extracurriculars', extracurricularRoutes);
router.use('/parent-auth', parentAuthRoutes);
router.use('/hostels', hostelRoutes);
router.use('/transport', transportRoutes);
router.use('/chat', chatRoutes);
router.use('/conversations', chatRoutes);
router.use('/admin/parent-chat-permissions', parentChatPermissionRoutes);
router.use('/plans', planRoutes);
router.use('/anonymous-reports', anonymousReportRoutes);
router.use('/games', gameRoutes);
router.use('/gamification', gameRoutes);
router.use('/pd', pdRoutes);
router.use('/support/tickets', supportRoutes);
router.use('/inspections', inspectionRoutes);
router.use('/academic-policies', policyRoutes);
router.use('/infrastructure', infrastructureRoutes);
router.use('/behavior', behaviorRoutes);
router.use('/admin-hub', adminHubRoutes);
router.use('/counseling', counselingRoutes);
console.log('Mounting conferenceRoutes at /api/conferences');
router.use('/conferences', conferenceRoutes);
router.use('/payment-plans', paymentPlanRoutes);
router.get('/cbt/exams', authenticate, requireTenant, QuizController.getQuizzes);

router.use('/saas-analytics', saasAnalyticsRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/versions', versionRoutes);
router.use('/id-cards', idCardRoutes);
router.use('/store', storeRoutes);
router.use('/vendors', vendorRoutes);
router.use('/maintenance', maintenanceRoutes);
router.use('/subscription', authenticate, requireTenant, subscriptionRoutes);
router.use('/pwa', authenticate, pwaRoutes);

// Tenant-scoped read endpoints consumed by the admin UI via api.from(...)
router.get('/school-documents', authenticate, requireTenant, getSchoolDocuments);
router.get('/external-integrations', authenticate, requireTenant, getExternalIntegrations);
router.put('/external-integrations/:id', authenticate, requireTenant, updateExternalIntegration);
router.post('/external-integrations/:id/sync', authenticate, requireTenant, syncExternalIntegration);
router.get('/third-party-apps', authenticate, getThirdPartyApps);
router.get('/app-installations', authenticate, requireTenant, getAppInstallations);
router.post('/app-installations', authenticate, requireTenant, installApp);
router.delete('/app-installations/by-app/:appId', authenticate, requireTenant, uninstallApp);
router.get('/teacher-salaries', authenticate, requireTenant, getTeacherSalaries);
router.post('/teacher-salaries', authenticate, requireTenant, createTeacherSalary);
router.put('/teacher-salaries/:id', authenticate, requireTenant, updateTeacherSalary);
router.get('/payroll/budgets', authenticate, requireTenant, getBudgets);
router.post('/payroll/budgets', authenticate, requireTenant, createBudget);
router.get('/community/pta-meetings', authenticate, requireTenant, getPtaMeetings);
router.post('/community/pta-meetings', authenticate, requireTenant, createPtaMeeting);
router.delete('/community/pta-meetings/:id', authenticate, requireTenant, deletePtaMeeting);
router.get('/accessibility-settings', authenticate, getAccessibilitySettings);
router.get('/payslips', authenticate, requireTenant, getPayslips);
router.put('/payslips/:id', authenticate, requireTenant, updatePayslipStatus);
router.get('/payment-transactions', authenticate, requireTenant, getPaymentTransactions);
router.post('/payment-transactions', authenticate, requireTenant, createPaymentTransaction);
router.get('/leave-requests', authenticate, requireTenant, getLeaveRequestsTop);
router.use('/leave-balances', leaveBalanceRoutes);
router.use('/scholarships', scholarshipRoutes);
router.use('/scholarship-applications', scholarshipApplicationRoutes);
router.use('/scholarship-recipients', scholarshipRecipientRoutes);
router.get('/id-verification-requests', authenticate, requireTenant, getVerificationRequests);
router.put('/id-verification-requests/:id', authenticate, requireTenant, reviewVerificationRequest);
router.get('/compliance-checklists', authenticate, requireTenant, getComplianceChecks);
router.post('/compliance-checklists/run', authenticate, requireTenant, runComplianceChecks);
router.get('/arrears', authenticate, requireTenant, getArrears);
router.use('/sponsorships', sponsorshipRoutes);
router.use('/sponsorship-requests', sponsorshipRequestRoutes);
// 🚨 DEBUG ROUTES: Only for testing — must be mounted BEFORE the offline-channel
// catch-all at '/', otherwise its authenticate middleware blocks /debug requests.
if (process.env.NODE_ENV !== 'production') {
    router.use('/debug', debugRoutes);
}

router.use('/', offlineChannelRoutes);

router.use('/', inviteRoutes);

export default router;
