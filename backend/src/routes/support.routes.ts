import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/tenant.middleware';
import { getSupportTickets, createSupportTicket, updateSupportTicket } from '../controllers/support.controller';

const router = Router();

router.use(authenticate);

router.get('/', getSupportTickets);
router.post('/', createSupportTicket);
router.patch('/:id', requireRole(['super_admin', 'superadmin']), updateSupportTicket);

export default router;
