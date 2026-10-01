import { Router } from 'express';
import { getMyInsights, askAI, getAskAISuggestions } from '../controllers/insight.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAIAllowed } from '../middleware/aiGate.middleware';

const router = Router();

router.use(authenticate);

router.get('/mine', getMyInsights);

// Ask AI spends real (billable) model calls, so it sits behind the same plan
// gate as the rest of the AI tools: free inside the demo, paid for real
// schools. Listing the questions is not gated - a locked school should still be
// able to see what it would get.
router.post('/ask', requireAIAllowed, askAI);
router.get('/ask/suggestions', getAskAISuggestions);

export default router;
