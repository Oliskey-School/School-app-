import { Router } from 'express';
import { getTickets, createTicket, updateStatus, updateTicket, deleteTicket } from '../controllers/maintenance.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate);
router.use(requireTenant);

router.get('/', getTickets);
router.post('/', createTicket);
router.patch('/:id/status', updateStatus);
router.put('/:id', updateTicket);
router.delete('/:id', deleteTicket);

export default router;
