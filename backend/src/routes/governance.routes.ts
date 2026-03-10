import { Router } from 'express';
import { getComplianceStatus, verifySystemIntegrity } from '../controllers/governance.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate);
router.use(requireTenant);

router.get('/compliance', getComplianceStatus);
router.get('/validate', verifySystemIntegrity);

export default router;
