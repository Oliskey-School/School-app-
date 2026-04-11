import { Router } from 'express';
import { triggerEmergencyBroadcast, getEmergencyHistory } from '../controllers/emergency.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate);
router.use(requireTenant);

router.post('/broadcast', triggerEmergencyBroadcast);
router.get('/history', getEmergencyHistory);

export default router;
