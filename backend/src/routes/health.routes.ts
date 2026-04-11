import { Router } from 'express';
import { getHealthLogs, createHealthLog } from '../controllers/health.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate);
router.use(requireTenant);

router.get('/', getHealthLogs);
router.post('/', createHealthLog);

export default router;
