import { Router } from 'express';
import { getComplianceStatus, verifySystemIntegrity } from '../controllers/governance.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant, requireRole } from '../middleware/tenant.middleware';

const ADMIN_ROLES = ['admin', 'proprietor', 'superadmin', 'super_admin'];

const router = Router();

router.use(authenticate);
router.use(requireTenant);
router.use(requireRole(ADMIN_ROLES));

// Root: alias for compliance overview (used by UnifiedGovernanceHub screen)
router.get('/', getComplianceStatus);
router.get('/compliance', getComplianceStatus);
router.get('/validate', verifySystemIntegrity);

export default router;
