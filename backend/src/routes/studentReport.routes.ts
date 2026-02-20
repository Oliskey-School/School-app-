import { Router } from 'express';
import { createAnonymousReport, createDiscreetRequest } from '../controllers/studentReport.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate);
router.use(requireTenant);

router.post('/anonymous', createAnonymousReport);
router.post('/discreet', createDiscreetRequest);

export default router;
