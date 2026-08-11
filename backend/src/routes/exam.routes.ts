import { Router } from 'express';
import { getExams, createExam, updateExam, deleteExam, getExamResults, upsertExamResults } from '../controllers/exam.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate);

// Exam creation/editing/deletion and result entry are staff-only actions —
// previously any authenticated user (including a student) could hit these;
// verified live via demo student token (only blocked by a Prisma field
// mismatch, not by any auth check).
const EXAM_STAFF = requireRole(['admin', 'proprietor', 'superadmin', 'super_admin', 'teacher']);

router.post('/results/upsert', EXAM_STAFF, upsertExamResults);
router.get('/', getExams);
router.post('/', EXAM_STAFF, createExam);
router.put('/:id', EXAM_STAFF, updateExam);
router.delete('/:id', EXAM_STAFF, deleteExam);
router.get('/:id/results', getExamResults);

export default router;
