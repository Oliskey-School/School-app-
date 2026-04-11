import { Router } from 'express';
import * as PlanController from '../controllers/plan.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/tenant.middleware';

const router = Router();

router.get('/', PlanController.getAllPlans);
router.post('/', authenticate, requireRole(['SuperAdmin']), PlanController.createPlan);
router.put('/:id', authenticate, requireRole(['SuperAdmin']), PlanController.updatePlan);
router.delete('/:id', authenticate, requireRole(['SuperAdmin']), PlanController.deletePlan);

export default router;
