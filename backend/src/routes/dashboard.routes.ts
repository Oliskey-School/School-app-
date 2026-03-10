import { Router } from 'express';
import { getStats, getAuditLogs } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/stats', authenticate, getStats);
router.get('/audit-logs', authenticate, getAuditLogs);

export default router;
