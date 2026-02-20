import { Router } from 'express';
import { createTeacher, getAllTeachers, getTeacherById, updateTeacher, deleteTeacher } from '../controllers/teacher.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/', authenticate, createTeacher);
router.get('/', authenticate, getAllTeachers);
router.get('/:id', authenticate, getTeacherById);
router.put('/:id', authenticate, updateTeacher);
router.delete('/:id', authenticate, deleteTeacher);

export default router;
