import { Router } from 'express';
import { getCalendarEvents } from '../controllers/calendar.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate);
router.use(requireTenant);

router.get('/', getCalendarEvents);

export default router;
