import { Router } from 'express';
import { getBuses, createBus, updateBus, deleteBus, getStudentBus } from '../controllers/bus.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate, requireTenant);

router.get('/', getBuses);
router.get('/student/:studentId', getStudentBus);
router.post('/', createBus);
router.put('/:id', updateBus);
router.delete('/:id', deleteBus);

export default router;
