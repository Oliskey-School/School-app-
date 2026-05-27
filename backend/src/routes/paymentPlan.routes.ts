import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as PaymentPlanController from '../controllers/paymentPlan.controller';
import prisma from '../config/database';

const router = Router();

// Secure all payment plan routes
router.use(authenticate);

// List all payment plans for students in the caller's school.
router.get('/', async (req: any, res) => {
    try {
        const school_id = req.user?.school_id;
        if (!school_id) return res.status(401).json({ message: 'Tenant context missing' });
        const plans = await prisma.paymentPlan.findMany({
            where: { student: { school_id } },
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
