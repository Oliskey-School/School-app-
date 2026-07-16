import { Router } from 'express';
import {
    getFlaggedStudents, getMyFlaggedStudents, getMyChildrenRisk, runManualScan, resolveFlag,
} from '../controllers/risk.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/students', getFlaggedStudents);
router.get('/students/mine', getMyFlaggedStudents);
router.get('/children', getMyChildrenRisk);
router.post('/scan', runManualScan);
router.patch('/:id/resolve', resolveFlag);

export default router;
