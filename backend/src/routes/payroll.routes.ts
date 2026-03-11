import { Router } from 'express';
import { getPayslips, getTransactions } from '../controllers/payroll.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/payslips', getPayslips);
router.get('/transactions', getTransactions);

export default router;
