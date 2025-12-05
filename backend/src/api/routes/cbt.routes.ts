
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import * as CBTController from '../controllers/cbt.controller';

const router = Router();

router.use(authenticateToken);

// Teacher/Admin Routes
router.post('/tests', CBTController.createTest);
router.get('/tests/teacher', CBTController.getTestsByTeacher);
router.put('/tests/:id/publish', CBTController.togglePublishTest);
router.delete('/tests/:id', CBTController.deleteTest);
router.get('/tests/:id/results', CBTController.getTestResults);

// Student Routes
router.get('/tests/student', CBTController.getAvailableTests);
router.post('/tests/:id/submit', CBTController.submitTest);

export default router;
