import { Router } from 'express';
import { createTeacher, getAllTeachers, getTeacherById, updateTeacher, deleteTeacher, submitMyAttendance, getMyHistory, getTeacherAttendance } from '../controllers/teacher.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePlanCapacity } from '../middleware/plan.middleware';

const router = Router();

router.post('/', authenticate, requirePlanCapacity('teacher'), createTeacher);
router.get('/', authenticate, getAllTeachers);
router.get('/attendance', authenticate, getTeacherAttendance);
router.post('/me/attendance', authenticate, submitMyAttendance);
router.get('/me/attendance', authenticate, getMyHistory);
router.get('/:id', authenticate, getTeacherById);
router.put('/:id', authenticate, updateTeacher);
router.delete('/:id', authenticate, deleteTeacher);

export default router;
