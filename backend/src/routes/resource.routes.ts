import { Router } from 'express';
import { createResource } from '../controllers/resource.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate);
router.use(requireTenant);

router.post('/', createResource);

export default router;
