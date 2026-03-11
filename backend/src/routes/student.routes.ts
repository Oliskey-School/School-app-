import { Router } from 'express';
import { enrollStudent, getAllStudents, getStudentById, getStudentByStudentId, updateStudent, bulkUpdateStatus, deleteStudent, getMyProfile, getMyPerformance, getMyQuizResults, linkGuardian, assignStudentToClass, removeStudentFromClass } from '../controllers/student.controller';
import { authenticate } from '../middleware/auth.middleware';
import { enforceTenant } from '../middleware/tenant.middleware';
import { requirePlanCapacity } from '../middleware/plan.middleware';
import { studentSchema } from '../../../shared/utils/validation';

const router = Router();

// All student routes are protected
router.get('/me', authenticate, getMyProfile);
router.get('/me/performance', authenticate, getMyPerformance);
router.get('/me/quiz-results', authenticate, getMyQuizResults);
router.post('/enroll', authenticate, requirePlanCapacity('student'), enforceTenant(studentSchema), enrollStudent);
router.post('/link-guardian', authenticate, linkGuardian);
router.get('/', authenticate, getAllStudents);
router.put('/bulk-status', authenticate, bulkUpdateStatus);
router.get('/id/:studentId', authenticate, getStudentByStudentId);
router.get('/:id', authenticate, getStudentById);
router.put('/:id', authenticate, updateStudent);
router.delete('/:id', authenticate, deleteStudent);
router.post('/:id/assign-class', authenticate, assignStudentToClass);
router.post('/:id/remove-class', authenticate, removeStudentFromClass);

export default router;
