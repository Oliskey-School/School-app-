import { Router } from 'express';
import { enrollStudent, getAllStudents, getStudentById, updateStudent, bulkUpdateStatus, deleteStudent, getMyProfile, getMyPerformance, getMyQuizResults, linkGuardian } from '../controllers/student.controller';
import { authenticate } from '../middleware/auth.middleware';
import { enforceTenant } from '../middleware/tenant.middleware';
import { studentSchema } from '../../../shared/utils/validation';

const router = Router();

// All student routes are protected
router.get('/me', authenticate, getMyProfile);
router.get('/me/performance', authenticate, getMyPerformance);
router.get('/me/quiz-results', authenticate, getMyQuizResults);
router.post('/enroll', authenticate, enforceTenant(studentSchema), enrollStudent);
router.post('/link-guardian', authenticate, linkGuardian);
router.get('/', authenticate, getAllStudents);
router.put('/bulk-status', authenticate, bulkUpdateStatus);
router.get('/:id', authenticate, getStudentById);
router.put('/:id', authenticate, updateStudent);
router.delete('/:id', authenticate, deleteStudent);

export default router;
