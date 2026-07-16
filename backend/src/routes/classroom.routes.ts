import { Router } from 'express';
import {
    getClassrooms, createClassroom, updateClassroom, deleteClassroom,
    scanClassroom, getMyLessonsToday, getDailyReport
} from '../controllers/classroom.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Classroom management (admin)
router.get('/', getClassrooms);
router.post('/', createClassroom);
router.put('/:id', updateClassroom);
router.delete('/:id', deleteClassroom);

// QR lesson attendance
router.post('/scan', scanClassroom);
router.get('/lesson-attendance/mine/today', getMyLessonsToday);
router.get('/lesson-attendance/report', getDailyReport);

export default router;
