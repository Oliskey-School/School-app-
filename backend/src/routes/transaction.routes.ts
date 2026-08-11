import { Router } from 'express';
import { getTransactions, createTransaction, verifyPayment } from '../controllers/transaction.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/tenant.middleware';

const ADMIN_ROLES = ['admin', 'proprietor', 'superadmin', 'super_admin'];

const router = Router();

router.use(authenticate);

// getTransactions returns the school's full raw payment ledger (no per-family
// filtering) and createTransaction lets the caller set status/amount directly
// with no gateway verification — both must be admin-only, or any parent/
// student/teacher token could read every family's payments or mint a fake
// "successful" payment record.
router.get('/', requireRole(ADMIN_ROLES), getTransactions);
router.post('/', requireRole(ADMIN_ROLES), createTransaction);
// Payment-gateway confirmation after a user's own checkout; stays open to any
// authenticated user since it only reads/reconciles a single reference.
router.get('/verify/:reference', verifyPayment);

export default router;
