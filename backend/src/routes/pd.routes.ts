import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getCourses, getMyEnrollments, enrollInCourse, updateProgress } from '../controllers/pd.controller';

const router = Router();

router.use(authenticate);

router.get('/courses', getCourses);
router.get('/my-enrollments', getMyEnrollments);
router.get('/courses/me', getMyEnrollments);
// The teacher CourseCatalog UI (components/teacher/CourseCatalog.tsx) posts to
// /pd/courses/:id/enroll and /pd/courses/:id/progress — those must exist.
// The older flat /enroll and /progress routes (courseId/enrollmentId in the
// body) are kept for any other callers.
router.post('/courses/:id/enroll', enrollInCourse);
router.put('/courses/:id/progress', updateProgress);
router.post('/enroll', enrollInCourse);
router.put('/progress', updateProgress);

export default router;
