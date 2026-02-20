import { Router } from 'express';
import { getTransactions, createTransaction } from '../controllers/transaction.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', getTransactions);
router.post('/', createTransaction);

export default router;
