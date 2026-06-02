import { Router } from 'express';
import { recordEventController, getStatusController } from '../controllers/pwa.controller';

// Mounted at /api/pwa with `authenticate` applied in routes/index.ts.
const router = Router();

router.post('/events', recordEventController);
router.get('/status', getStatusController);

export default router;
