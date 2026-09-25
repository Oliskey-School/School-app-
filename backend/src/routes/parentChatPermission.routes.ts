import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant, requireRole } from '../middleware/tenant.middleware';
import {
    listPermissions,
    grantPermission,
    revokePermission,
    listParentsForPicker,
    listTeachersForPicker
} from '../controllers/parentChatPermission.controller';

const router = Router();
router.use(authenticate);
router.use(requireTenant);

router.get('/', listPermissions);
router.post('/', requireRole(['admin', 'proprietor', 'superadmin', 'super_admin']), grantPermission);
router.delete('/:id', requireRole(['admin', 'proprietor', 'superadmin', 'super_admin']), revokePermission);
router.get('/parents', listParentsForPicker);
router.get('/teachers', listTeachersForPicker);

export default router;
