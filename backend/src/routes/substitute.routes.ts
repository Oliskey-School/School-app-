import { Router } from 'express';
import {
    getCoverageNeeded, assignSubstitute, getHistory, getMyAssignments, respondToAssignment,
} from '../controllers/substitute.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/coverage', getCoverageNeeded);
router.post('/assign', assignSubstitute);
router.get('/history', getHistory);
router.get('/mine', getMyAssignments);
router.post('/:id/respond', respondToAssignment);

export default router;
