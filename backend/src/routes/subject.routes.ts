import { Router } from 'express';
import { getSubjects, getCurriculumTopics, createSubject, deleteSubject, updateSubjectColor } from '../controllers/subject.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, getSubjects);
router.post('/', authenticate, createSubject);
router.delete('/:id', authenticate, deleteSubject);
router.put('/:id/color', authenticate, updateSubjectColor);
router.get('/:subjectId/topics', authenticate, getCurriculumTopics);

export default router;
