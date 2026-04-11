import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getCourses, getMyEnrollments, enrollInCourse, updateProgress } from '../controllers/pd.controller';

const router = Router();

router.use(authenticate);

router.get('/courses', getCourses);
router.get('/my-enrollments', getMyEnrollments);
router.post('/enroll', enrollInCourse);
router.put('/progress', updateProgress);

export default router;
