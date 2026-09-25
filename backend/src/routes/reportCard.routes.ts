import { Router } from 'express';
import { getReportCards, getReportCard, updateStatus, publishReportCards } from '../controllers/reportCard.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/tenant.middleware';
import { exportLimiter } from '../middleware/rateLimiters';

const router = Router();

router.use(authenticate);

router.get('/', getReportCards);
router.post('/publish', exportLimiter, publishReportCards);
router.get('/:id', getReportCard);
// Approve / reject / publish is school leadership's call (the admin publishing
// screen is the only caller). Without this gate any student or parent could
// flip any report card's status by id.
router.put('/:id/status', requireRole(['admin', 'proprietor', 'superadmin', 'super_admin']), updateStatus);

export default router;
