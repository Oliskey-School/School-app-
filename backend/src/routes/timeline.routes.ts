import { Router } from 'express';
import { getStudentTimeline, getTeacherTimeline, addEvent, deleteEvent } from '../controllers/timeline.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/student/:id', getStudentTimeline);
router.get('/teacher/:id', getTeacherTimeline);
router.post('/', addEvent);
router.delete('/:id', deleteEvent);

export default router;
