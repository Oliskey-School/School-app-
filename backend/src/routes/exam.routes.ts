import { Router } from 'express';
import { getExams, createExam, updateExam, deleteExam, getExamResults } from '../controllers/exam.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', getExams);
router.post('/', createExam);
router.put('/:id', updateExam);
router.delete('/:id', deleteExam);
router.get('/:id/results', getExamResults);

export default router;
