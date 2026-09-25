import { Router } from 'express';
import { getExamBodies, createExamBody, getExamRegistrations, createExamRegistrations } from '../controllers/externalExam.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate);

// Default root: list configured external exam bodies for the caller's school.
router.get('/', getExamBodies);
router.get('/bodies', getExamBodies);
router.post('/bodies', requireRole(['admin', 'proprietor', 'superadmin', 'super_admin', 'exam_officer', 'examofficer']), createExamBody);
router.get('/registrations/:bodyId', getExamRegistrations);
router.post('/registrations', requireRole(['admin', 'proprietor', 'superadmin', 'super_admin', 'exam_officer', 'examofficer']), createExamRegistrations);

export default router;
