import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as PaymentPlanController from '../controllers/paymentPlan.controller';
import prisma from '../config/database';
import { getEffectiveBranchId } from '../utils/branchScope';

const router = Router();

// Secure all payment plan routes
router.use(authenticate);

// List all payment plans for students in the caller's school/branch. Admin-only —
// a parent/student calling this without a fee_id filter would otherwise see every
// other family's payment plans in the branch.
const ADMIN_ROLES = ['admin', 'proprietor', 'superadmin', 'super_admin'];
router.get('/', async (req: any, res) => {
    try {
        const school_id = req.user?.school_id;
        if (!school_id) return res.status(401).json({ message: 'Tenant context missing' });
        if (!ADMIN_ROLES.includes((req.user?.role || '').toLowerCase())) {
            return res.status(403).json({ message: 'Only admins can list all payment plans' });
        }
        const branchId = getEffectiveBranchId(req.user, req.query.branch_id as string);
        const plans = await prisma.paymentPlan.findMany({
            where: { school_id, ...(branchId ? { branch_id: branchId } : {}) },
            orderBy: { created_at: 'desc' }
        });
        res.json(plans);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/', PaymentPlanController.createPaymentPlan);
router.post('/installments', PaymentPlanController.createInstallments);
router.get('/fee/:feeId', PaymentPlanController.getPaymentPlanByFeeId);
router.get('/installments/upcoming', PaymentPlanController.getUpcomingInstallments);
router.put('/:id/status', PaymentPlanController.updatePaymentPlanStatus);
router.post('/installments/:id/pay', PaymentPlanController.processInstallmentPayment);
router.delete('/:id', PaymentPlanController.deletePaymentPlan);

export default router;
