import { Router } from 'express';
import { getAttendance, saveAttendance, getAttendanceByStudent, bulkFetchAttendance } from '../controllers/attendance.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.post('/bulk-fetch', bulkFetchAttendance);
router.get('/', getAttendance);
router.post('/', saveAttendance);
router.get('/student/:studentId', getAttendanceByStudent);

export default router;
