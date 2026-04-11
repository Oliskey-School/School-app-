import { Router } from 'express';
import { getStats, getAuditLogs, getParentTodayUpdate, globalSearch } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/stats', authenticate, getStats);
router.get('/:schoolId/stats', authenticate, getStats);
router.get('/audit-logs', authenticate, getAuditLogs);
router.get('/:schoolId/audit-logs', authenticate, getAuditLogs);
router.get('/parent/today', authenticate, getParentTodayUpdate);
router.get('/search', authenticate, globalSearch);

export default router;
