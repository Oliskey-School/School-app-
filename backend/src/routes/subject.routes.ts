import { Router } from 'express';
import { getSubjects, getCurriculumTopics } from '../controllers/subject.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, getSubjects);
router.get('/:subjectId/topics', authenticate, getCurriculumTopics);

export default router;
