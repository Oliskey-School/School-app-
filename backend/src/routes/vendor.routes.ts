import { Router } from 'express';
import { getVendors, createVendor, updateVendor, deleteVendor } from '../controllers/vendor.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant, requireRole } from '../middleware/tenant.middleware';

const ADMIN_ROLES = ['admin', 'proprietor', 'superadmin', 'super_admin'];

const router = Router();

router.use(authenticate);
router.use(requireTenant);

router.get('/', getVendors);
router.post('/', requireRole(ADMIN_ROLES), createVendor);
router.put('/:id', requireRole(ADMIN_ROLES), updateVendor);
router.delete('/:id', requireRole(ADMIN_ROLES), deleteVendor);

export default router;
