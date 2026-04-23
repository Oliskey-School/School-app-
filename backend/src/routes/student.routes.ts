import { Router } from 'express';
import { 
    enrollStudent, 
    approveStudent, 
    getAllStudents, 
    getStudentById, 
    getStudentByStudentId, 
    updateStudent, 
    bulkUpdateStatus, 
    deleteStudent, 
    getMyProfile, 
    getMyPerformance, 
    getMyQuizResults, 
    getMySubmissions, 
    getMyFees, 
    getMyReportCards,
    getMyStats,
    getMyAchievements,
    getMyDashboardOverview,
    getMyAttendance,
    getMySubjects,
    getMyActivities,
    linkGuardian, 
    unlinkGuardian, 
    assignStudentToClass, 
    removeStudentFromClass, 
    getStudentPerformance, 
    getStudentBehaviorNotes,
    getStudentsByClass,
    getStudentsByClassId,
    getPendingApprovals,
    getStudentSubjects,
    getMyDocuments,
    addMyDocument,
    getStudentsBySubject
} from '../controllers/student.controller';
import { authenticate } from '../middleware/auth.middleware';
import { enforceTenant } from '../middleware/tenant.middleware';
import { requirePlanCapacity } from '../middleware/plan.middleware';
import { studentSchema } from '../../../shared/utils/validation';

const router = Router();

// All student routes are protected
router.get('/me', authenticate, getMyProfile);
router.get('/me/performance', authenticate, getMyPerformance);
router.get('/me/quiz-results', authenticate, getMyQuizResults);
router.get('/me/submissions', authenticate, getMySubmissions);
router.get('/me/fees', authenticate, getMyFees);
router.get('/me/report-cards', authenticate, getMyReportCards);
router.get('/me/stats', authenticate, getMyStats);
router.get('/me/achievements', authenticate, getMyAchievements);
router.get('/me/dashboard', authenticate, getMyDashboardOverview);
router.get('/me/attendance', authenticate, getMyAttendance);
router.get('/me/subjects', authenticate, getMySubjects);
router.get('/me/activities', authenticate, getMyActivities);
router.get('/me/extracurriculars', authenticate, getMyActivities);
router.get('/me/documents', authenticate, getMyDocuments);
router.post('/me/documents', authenticate, addMyDocument);

router.get('/:id/performance', authenticate, getStudentPerformance);
router.get('/:id/academic-performance', authenticate, getStudentPerformance);
router.get('/:id/academic-records', authenticate, getStudentPerformance);
router.get('/:id/behavior-notes', authenticate, getStudentBehaviorNotes);
router.get('/:id/subjects', authenticate, getStudentSubjects);

router.post('/enroll', authenticate, requirePlanCapacity('student'), enforceTenant(studentSchema), enrollStudent);
router.post('/:id/approve', authenticate, approveStudent);
router.post('/link-guardian', authenticate, linkGuardian);
router.post('/unlink-guardian', authenticate, unlinkGuardian);

router.get('/pending-approvals', authenticate, getPendingApprovals);
router.get('/class/:classId', authenticate, getStudentsByClassId);
router.get('/by-class', authenticate, getStudentsByClass);
router.get('/', authenticate, getAllStudents);
router.put('/bulk-status', authenticate, bulkUpdateStatus);
router.get('/id/:studentId', authenticate, getStudentByStudentId);
router.get('/subject/:subjectId', authenticate, getStudentsBySubject);
router.get('/:id', authenticate, getStudentById);
router.put('/:id', authenticate, updateStudent);
router.delete('/:id', authenticate, deleteStudent);
router.post('/:id/assign-class', authenticate, assignStudentToClass);
router.post('/:id/remove-class', authenticate, removeStudentFromClass);

export default router;
