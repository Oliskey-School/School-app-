import { Router } from 'express';
import { getExams, createExam, updateExam, deleteExam, getExamResults, upsertExamResults } from '../controllers/exam.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.post('/results/upsert', upsertExamResults);
router.get('/', getExams);
router.post('/', createExam);
router.put('/:id', updateExam);
router.delete('/:id', deleteExam);
router.get('/:id/results', getExamResults);

export default router;
