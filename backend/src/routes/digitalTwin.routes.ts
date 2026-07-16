import { Router } from 'express';
import { getSnapshot } from '../controllers/digitalTwin.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/snapshot', getSnapshot);

export default router;
