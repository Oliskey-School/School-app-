import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import * as QuizController from '../controllers/quiz.controller';

const router = Router();

// Apply middleware to all routes
router.use(authenticate);
router.use(requireTenant);

router.get('/', QuizController.getQuizzes);
router.post('/upload', QuizController.createQuizWithQuestions);
router.post('/submit', QuizController.submitQuizResult);
router.put('/:id/status', QuizController.updateQuizStatus);
router.delete('/:id', QuizController.deleteQuiz);

export default router;
