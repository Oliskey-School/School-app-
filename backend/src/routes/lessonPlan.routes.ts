import { Router } from 'express';
import { getLessonPlans, createLessonPlan, updateLessonPlan, deleteLessonPlan } from '../controllers/lessonPlan.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate);
router.use(requireTenant);

router.get('/', getLessonPlans);
router.post('/', createLessonPlan);
router.put('/:id', updateLessonPlan);
router.delete('/:id', deleteLessonPlan);

export default router;
