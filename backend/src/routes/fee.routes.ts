import { Router } from 'express';
import { createFee, getAllFees, getFeeById, updateFee, updateFeeStatus, deleteFee, bulkFetchFees } from '../controllers/fee.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.post('/bulk-fetch', bulkFetchFees);
router.post('/', createFee);
router.get('/', getAllFees);
router.get('/:id', getFeeById);
router.put('/:id', updateFee);
router.put('/:id/status', updateFeeStatus);
router.delete('/:id', deleteFee);

export default router;
