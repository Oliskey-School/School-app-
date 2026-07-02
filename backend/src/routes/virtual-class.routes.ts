import { Router } from 'express';
import { createVirtualClassSession, getVirtualClassSessions, getActiveVirtualClasses, endVirtualClassSession, recordVirtualAttendance, deleteVirtualClassSession } from '../controllers/virtual-class.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

// Apply auth to all routes
router.use(authenticate);
router.use(requireTenant);

router.get('/', getVirtualClassSessions);
router.get('/active', getActiveVirtualClasses);
router.post('/', createVirtualClassSession);
router.post('/:id/end', endVirtualClassSession);
router.post('/attendance', recordVirtualAttendance);
router.delete('/:id', deleteVirtualClassSession);

export default router;
