import { Router } from 'express';
import { saveGrade, getGrades, getSubjects, getAnalytics } from '../controllers/academic.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate);
router.use(requireTenant);

router.get('/subjects', getSubjects);
router.get('/analytics', getAnalytics);
router.post('/grades', getGrades);
router.put('/grade', saveGrade); // Using PUT for upserts

export default router;
