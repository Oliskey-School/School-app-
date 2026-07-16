import { Router } from 'express';
import { getMyInsights, askAI, getAskAISuggestions } from '../controllers/insight.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/mine', getMyInsights);
router.post('/ask', askAI);
router.get('/ask/suggestions', getAskAISuggestions);

export default router;
