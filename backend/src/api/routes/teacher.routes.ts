
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import * as TeacherController from '../controllers/teacher.controller';

const router = Router();

router.use(authenticateToken);

router.get('/classes', TeacherController.getClasses);
router.get('/students', TeacherController.getStudents);
router.post('/assignments', TeacherController.createAssignment);
router.get('/assignments', TeacherController.getAssignments);
router.post('/attendance', TeacherController.markAttendance);

export default router;
