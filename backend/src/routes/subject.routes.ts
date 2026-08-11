import { Router } from 'express';
import { getSubjects, getCurriculumTopics, createSubject, deleteSubject, updateSubjectColor } from '../controllers/subject.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/tenant.middleware';

const router = Router();

// Curriculum/subject management is admin & teacher territory (matches
// AddTeacherScreen.tsx / TimetableDeskBuilder.tsx, both admin-side).
// Previously any authenticated user — including a student — could create
// or delete subjects; verified live via demo student token.
const CURRICULUM_STAFF = requireRole(['admin', 'proprietor', 'superadmin', 'super_admin', 'teacher']);

router.get('/', authenticate, getSubjects);
router.post('/', authenticate, CURRICULUM_STAFF, createSubject);
router.delete('/:id', authenticate, CURRICULUM_STAFF, deleteSubject);
router.put('/:id/color', authenticate, CURRICULUM_STAFF, updateSubjectColor);
router.get('/:subjectId/topics', authenticate, getCurriculumTopics);

export default router;
