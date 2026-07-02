import { Router } from 'express';
import { getLeaveBalances, createLeaveBalance, updateLeaveBalance, deleteLeaveBalance } from '../controllers/leaveBalance.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', getLeaveBalances);
router.post('/', createLeaveBalance);
router.put('/:id', updateLeaveBalance);
router.delete('/:id', deleteLeaveBalance);

export default router;
