import { Router } from 'express';
import authRoutes from './auth.routes';
import onboardingRoutes from './onboarding.routes';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import {
    getSchoolDocuments, getExternalIntegrations, getThirdPartyApps, getAppInstallations,
    getTeacherSalaries, getBudgets, getPtaMeetings, getAccessibilitySettings,
    getPayslips, getPaymentTransactions, getLeaveRequestsTop, getEmptyList, getArrears
} from '../controllers/misc.controller';
import userRoutes from './user.routes';
import schoolRoutes from './school.routes';
import inviteRoutes from './invite.routes';
import studentRoutes from './student.routes';
import teacherRoutes from './teacher.routes';
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
import * as QuizController from '../controllers/quiz.controller';
import * as ParentController from '../controllers/parent.controller';
import { getStudentFeesLegacy } from '../controllers/fee.controller';

const router = Router();

// Public health check for the API prefix
router.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'School SaaS API' });
});

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
router.use('/transactions', transactionRoutes);
router.use('/timetables', timetableRoutes);
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
router.use('/plans', planRoutes);
router.use('/anonymous-reports', anonymousReportRoutes);
router.use('/games', gameRoutes);
router.use('/gamification', gameRoutes);
router.use('/pd', pdRoutes);
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

// Tenant-scoped read endpoints consumed by the admin UI via api.from(...)
router.get('/school-documents', authenticate, requireTenant, getSchoolDocuments);
router.get('/external-integrations', authenticate, requireTenant, getExternalIntegrations);
router.get('/third-party-apps', authenticate, getThirdPartyApps);
router.get('/app-installations', authenticate, requireTenant, getAppInstallations);
router.get('/teacher-salaries', authenticate, requireTenant, getTeacherSalaries);
router.get('/payroll/budgets', authenticate, requireTenant, getBudgets);
router.get('/community/pta-meetings', authenticate, requireTenant, getPtaMeetings);
router.get('/accessibility-settings', authenticate, getAccessibilitySettings);
router.get('/payslips', authenticate, requireTenant, getPayslips);
router.get('/payment-transactions', authenticate, requireTenant, getPaymentTransactions);
router.get('/leave-requests', authenticate, requireTenant, getLeaveRequestsTop);
router.get('/leave-balances', authenticate, requireTenant, getEmptyList);
router.get('/scholarships', authenticate, requireTenant, getEmptyList);
router.get('/scholarship-applications', authenticate, requireTenant, getEmptyList);
router.get('/scholarship-recipients', authenticate, requireTenant, getEmptyList);
router.get('/id-verification-requests', authenticate, requireTenant, getEmptyList);
router.get('/arrears', authenticate, requireTenant, getArrears);
router.get('/sponsorships', authenticate, requireTenant, getEmptyList);
router.get('/sponsorship-requests', authenticate, requireTenant, getEmptyList);
// 🚨 DEBUG ROUTES: Only for testing — must be mounted BEFORE the offline-channel
// catch-all at '/', otherwise its authenticate middleware blocks /debug requests.
if (process.env.NODE_ENV !== 'production') {
    router.use('/debug', debugRoutes);
}

router.use('/', offlineChannelRoutes);
router.get('/parent-children', authenticate, ParentController.getParentChildren);

router.use('/', inviteRoutes);

export default router;
