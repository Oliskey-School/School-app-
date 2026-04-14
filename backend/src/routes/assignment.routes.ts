import { Router } from 'express';
import { getAssignments, createAssignment, getSubmissions, getAssignmentSubmission, gradeSubmission, submitAssignment, deleteAssignment } from '../controllers/assignment.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate);
router.use(requireTenant);

router.get('/', getAssignments);
router.post('/', createAssignment);
router.post('/:id/submissions', submitAssignment);
router.post('/:id/submit', submitAssignment);
router.get('/:id/submissions', getSubmissions);
router.get('/:id/submission', getAssignmentSubmission);
router.put('/submissions/:id/grade', gradeSubmission);
router.delete('/:id', deleteAssignment);

export default router;
