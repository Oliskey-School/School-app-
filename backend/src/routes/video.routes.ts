import { Router } from 'express';
import { getVideoStatus, createVideoRoom } from '../controllers/video.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate);
router.use(requireTenant);

router.get('/status', getVideoStatus);
router.post('/room', createVideoRoom);

export default router;
