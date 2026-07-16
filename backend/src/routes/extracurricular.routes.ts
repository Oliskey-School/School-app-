import { Router } from 'express';
import { getAllActivities, getMyActivities, joinActivity, leaveActivity, getEventsByDateRange, setActivityAdvisor, createActivity, markClubAttendance, getClubAttendance, addClubAchievement, getClubAchievements } from '../controllers/extracurricular.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, getAllActivities);
router.post('/', authenticate, createActivity);
router.get('/me', authenticate, getMyActivities);
router.post('/join', authenticate, joinActivity);
router.delete('/leave/:activityId', authenticate, leaveActivity);
router.get('/events', authenticate, getEventsByDateRange);
router.put('/:id/advisor', authenticate, setActivityAdvisor);
router.post('/:id/attendance', authenticate, markClubAttendance);
router.get('/:id/attendance', authenticate, getClubAttendance);
router.post('/:id/achievements', authenticate, addClubAchievement);
router.get('/:id/achievements', authenticate, getClubAchievements);

export default router;
