import { Router } from 'express';
import { getTransactions, createTransaction, verifyPayment } from '../controllers/transaction.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', getTransactions);
router.post('/', createTransaction);
router.get('/verify/:reference', verifyPayment);

export default router;
