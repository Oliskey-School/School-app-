import { Router } from 'express';
import { triggerEmergencyBroadcast, getEmergencyHistory } from '../controllers/emergency.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant, requireRole } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate);
router.use(requireTenant);

// Default root: emergency broadcast history for the caller's school.
router.get('/', getEmergencyHistory);
router.post('/broadcast', requireRole(['admin', 'proprietor', 'superadmin', 'super_admin']), triggerEmergencyBroadcast);
router.get('/history', getEmergencyHistory);

export default router;
