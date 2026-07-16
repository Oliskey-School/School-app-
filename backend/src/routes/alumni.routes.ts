import { Router } from 'express';
import { listPastStudents, getPastStudentHistory, markExit, updateExitInfo } from '../controllers/alumni.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', listPastStudents);
router.get('/:studentId/history', getPastStudentHistory);
router.post('/:studentId/mark-exit', markExit);
router.put('/:studentId/exit-info', updateExitInfo);

export default router;
