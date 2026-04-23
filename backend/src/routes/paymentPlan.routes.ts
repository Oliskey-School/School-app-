import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as PaymentPlanController from '../controllers/paymentPlan.controller';

const router = Router();

// Secure all payment plan routes
router.use(authenticate);

router.post('/', PaymentPlanController.createPaymentPlan);
router.post('/installments', PaymentPlanController.createInstallments);
router.get('/fee/:feeId', PaymentPlanController.getPaymentPlanByFeeId);
router.get('/installments/upcoming', PaymentPlanController.getUpcomingInstallments);
router.put('/:id/status', PaymentPlanController.updatePaymentPlanStatus);
router.post('/installments/:id/pay', PaymentPlanController.processInstallmentPayment);
router.delete('/:id', PaymentPlanController.deletePaymentPlan);

export default router;
