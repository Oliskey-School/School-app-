import { Router } from 'express';
import { getAllActivities, getMyActivities, joinActivity, leaveActivity, getEventsByDateRange } from '../controllers/extracurricular.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, getAllActivities);
router.get('/me', authenticate, getMyActivities);
router.post('/join', authenticate, joinActivity);
router.delete('/leave/:activityId', authenticate, leaveActivity);
router.get('/events', authenticate, getEventsByDateRange);

export default router;
