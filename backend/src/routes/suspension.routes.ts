import { Router } from 'express';
import {
    issueSuspension, confirmReturn, listSuspensions, getMySuspensions, getChildSuspensions, getStudentSuspensions
} from '../controllers/suspension.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', listSuspensions);
router.post('/', issueSuspension);
router.post('/:id/confirm-return', confirmReturn);
router.get('/mine/student', getMySuspensions);
router.get('/mine/children', getChildSuspensions);
router.get('/student/:studentId', getStudentSuspensions);

export default router;
