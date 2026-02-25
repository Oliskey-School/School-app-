import { Router } from 'express';
import { getGeneratedResources, saveGeneratedResource } from '../controllers/ai.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate);
router.use(requireTenant);

router.get('/generated-resources', getGeneratedResources);
router.post('/generated-resources', saveGeneratedResource);

export default router;
