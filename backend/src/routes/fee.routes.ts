import { Router } from 'express';
import { createFee, getAllFees, getFeeById, updateFee, updateFeeStatus, deleteFee, bulkFetchFees, getFinancialAnalytics, recordPayment, getPaymentHistory, deletePayment, getTransactions } from '../controllers/fee.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.post('/record-payment', recordPayment);
router.get('/history', getPaymentHistory);
router.delete('/payments/:id', deletePayment);
router.post('/bulk-fetch', bulkFetchFees);
router.post('/', createFee);
router.get('/analytics', getFinancialAnalytics);
router.get('/', getAllFees);
router.get('/:id', getFeeById);
router.put('/:id', updateFee);
router.put('/:id/status', updateFeeStatus);
router.delete('/:id', deleteFee);

router.get('/:id/transactions', getTransactions);

export default router;
