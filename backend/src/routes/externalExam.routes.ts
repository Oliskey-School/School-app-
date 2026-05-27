import { Router } from 'express';
import { getExamBodies, createExamBody, getExamRegistrations, createExamRegistrations } from '../controllers/externalExam.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Default root: list configured external exam bodies for the caller's school.
router.get('/', getExamBodies);
router.get('/bodies', getExamBodies);
router.post('/bodies', createExamBody);
router.get('/registrations/:bodyId', getExamRegistrations);
router.post('/registrations', createExamRegistrations);

export default router;
