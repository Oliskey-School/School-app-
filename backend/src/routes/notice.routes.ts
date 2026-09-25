import { Router } from 'express';
import { getNotices, createNotice, deleteNotice } from '../controllers/notice.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant, requireRole } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate);
router.use(requireTenant);

router.get('/', getNotices);
router.post('/', requireRole(['admin', 'proprietor', 'superadmin', 'super_admin', 'teacher']), createNotice);
router.delete('/:id', requireRole(['admin', 'proprietor', 'superadmin', 'super_admin', 'teacher']), deleteNotice);

export default router;
