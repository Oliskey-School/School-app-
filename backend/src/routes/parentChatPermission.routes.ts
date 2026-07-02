import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
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
router.post('/', grantPermission);
router.delete('/:id', revokePermission);
router.get('/parents', listParentsForPicker);
router.get('/teachers', listTeachersForPicker);

export default router;
