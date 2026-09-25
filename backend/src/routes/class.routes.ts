import { Router } from 'express';
import { getClasses, getClass, getClassStudents, createClass, updateClass, deleteClass, getClassSubjects, getClassSubjectsById, initializeClasses, getClassQr, rotateClassQr } from '../controllers/class.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/tenant.middleware';

const router = Router();

router.get('/subjects', authenticate, getClassSubjects);
router.post('/initialize', authenticate, requireRole(['admin', 'proprietor', 'superadmin', 'super_admin']), initializeClasses);
router.get('/', authenticate, getClasses);
router.get('/:id/qr', authenticate, getClassQr);
router.post('/:id/qr', authenticate, rotateClassQr);
router.get('/:id', authenticate, getClass);
router.get('/:id/students', authenticate, getClassStudents);
router.get('/:id/subjects', authenticate, getClassSubjectsById);
router.post('/', authenticate, requireRole(['admin', 'proprietor', 'superadmin', 'super_admin']), createClass);
router.put('/:id', authenticate, requireRole(['admin', 'proprietor', 'superadmin', 'super_admin']), updateClass);
router.delete('/:id', authenticate, requireRole(['admin', 'proprietor', 'superadmin', 'super_admin']), deleteClass);

export default router;
