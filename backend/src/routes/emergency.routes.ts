import { Router } from 'express';
import { triggerEmergencyBroadcast, getEmergencyHistory } from '../controllers/emergency.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate);
router.use(requireTenant);

// Default root: emergency broadcast history for the caller's school.
router.get('/', getEmergencyHistory);
router.post('/broadcast', triggerEmergencyBroadcast);
router.get('/history', getEmergencyHistory);

export default router;
