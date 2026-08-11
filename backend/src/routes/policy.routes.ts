import { Router } from 'express';
import { getPolicies, createPolicy, deletePolicy, getPermissionSlips, createPermissionSlip, bulkCreatePermissionSlips, updatePermissionSlip } from '../controllers/policy.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant, requireRole } from '../middleware/tenant.middleware';

const ADMIN_ROLES = ['admin', 'proprietor', 'superadmin', 'super_admin'];

const router = Router();

router.use(authenticate);
router.use(requireTenant);

router.get('/policies', getPolicies);
router.post('/policies', requireRole(ADMIN_ROLES), createPolicy);
router.delete('/policies/:id', requireRole(ADMIN_ROLES), deletePolicy);

router.get('/permission-slips', getPermissionSlips);
router.post('/permission-slips', requireRole(ADMIN_ROLES), createPermissionSlip);
router.post('/permission-slips/bulk', requireRole(ADMIN_ROLES), bulkCreatePermissionSlips);
// Admins can edit any field; parents may only record their sign-off (enforced
// in the controller, since it needs to allow the 'parent' role through).
router.patch('/permission-slips/:id', updatePermissionSlip);

export default router;
