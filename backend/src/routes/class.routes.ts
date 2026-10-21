import { Router } from 'express';
import { getClasses, getClass, getClassStudents, createClass, updateClass, deleteClass, getClassSubjects, getClassSubjectsById, initializeClasses, getClassQr, rotateClassQr, getClassSubjectImpact, addClassSubject, removeClassSubject } from '../controllers/class.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/subjects', authenticate, getClassSubjects);
router.post('/initialize', authenticate, initializeClasses);
router.get('/', authenticate, getClasses);
router.get('/:id/qr', authenticate, getClassQr);
router.post('/:id/qr', authenticate, rotateClassQr);
router.get('/:id', authenticate, getClass);
router.get('/:id/students', authenticate, getClassStudents);
router.get('/:id/subjects/impact', authenticate, getClassSubjectImpact);
router.get('/:id/subjects', authenticate, getClassSubjectsById);
router.post('/:id/subjects', authenticate, addClassSubject);
router.delete('/:id/subjects/:subjectId', authenticate, removeClassSubject);
router.post('/', authenticate, createClass);
router.put('/:id', authenticate, updateClass);
router.delete('/:id', authenticate, deleteClass);

export default router;
