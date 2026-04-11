import { Router } from 'express';
import { createVirtualClassSession, getVirtualClassSessions, recordVirtualAttendance } from '../controllers/virtual-class.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

// Apply auth to all routes
router.use(authenticate);
router.use(requireTenant);

router.get('/', getVirtualClassSessions);
router.post('/', createVirtualClassSession);
router.post('/attendance', recordVirtualAttendance);

export default router;
