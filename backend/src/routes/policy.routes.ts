import { Router } from 'express';
import { getPolicies, createPolicy, deletePolicy, getPermissionSlips, createPermissionSlip, bulkCreatePermissionSlips, updatePermissionSlip } from '../controllers/policy.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate);
router.use(requireTenant);

router.get('/policies', getPolicies);
router.post('/policies', createPolicy);
router.delete('/policies/:id', deletePolicy);

router.get('/permission-slips', getPermissionSlips);
router.post('/permission-slips', createPermissionSlip);
router.post('/permission-slips/bulk', bulkCreatePermissionSlips);
router.patch('/permission-slips/:id', updatePermissionSlip);

export default router;
