import { Router } from 'express';
import { getPhotos } from '../controllers/gallery.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate);
router.use(requireTenant);

router.get('/', getPhotos);

export default router;
