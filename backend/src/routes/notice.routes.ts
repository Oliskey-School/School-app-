import { Router } from 'express';
import { getNotices, createNotice, deleteNotice } from '../controllers/notice.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate);
router.use(requireTenant);

router.get('/', getNotices);
router.post('/', createNotice);
router.delete('/:id', deleteNotice);

export default router;
