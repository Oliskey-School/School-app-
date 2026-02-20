import { Router } from 'express';
import { getParents, createParent, getParentById, updateParent, deleteParent, getMyChildren, createAppointment, volunteerSignup, markNotificationRead } from '../controllers/parent.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate);
router.use(requireTenant);

router.get('/me/children', getMyChildren);
router.get('/', getParents);
router.post('/', createParent);
router.post('/appointments', createAppointment);
router.post('/volunteer-signup', volunteerSignup);
router.put('/notifications/:id/read', markNotificationRead);
router.get('/:id', getParentById);
router.put('/:id', updateParent);
router.delete('/:id', deleteParent);

export default router;

