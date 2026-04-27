import { Router } from 'express';
import { getSubjects, getCurriculumTopics, createSubject } from '../controllers/subject.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, getSubjects);
router.post('/', authenticate, createSubject);
router.get('/:subjectId/topics', authenticate, getCurriculumTopics);

export default router;
