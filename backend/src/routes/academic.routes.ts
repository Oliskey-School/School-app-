import { Router } from 'express';
import { saveGrade, getGrades } from '../controllers/academic.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate);
router.use(requireTenant);

router.post('/grades', getGrades); // Using POST to send a list of IDs in body
router.put('/grade', saveGrade); // Using PUT for upserts

export default router;
