import { Router } from 'express';
import { getClasses, getClass, getClassStudents, createClass, updateClass, deleteClass, getClassSubjects, initializeClasses } from '../controllers/class.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/subjects', authenticate, getClassSubjects);
router.post('/initialize', authenticate, initializeClasses);
router.get('/', authenticate, getClasses);
router.get('/:id', authenticate, getClass);
router.get('/:id/students', authenticate, getClassStudents);
router.post('/', authenticate, createClass);
router.put('/:id', authenticate, updateClass);
router.delete('/:id', authenticate, deleteClass);

export default router;
