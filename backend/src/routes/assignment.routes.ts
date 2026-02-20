import { Router } from 'express';
import { getAssignments, createAssignment, getSubmissions, gradeSubmission, submitAssignment } from '../controllers/assignment.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate);
router.use(requireTenant);

router.get('/', getAssignments);
router.post('/', createAssignment);
router.post('/:id/submissions', submitAssignment);
router.get('/:id/submissions', getSubmissions);
router.put('/submissions/:id/grade', gradeSubmission);

export default router;
