
import { Router } from 'express';
import { generateResponse } from '../controllers/ai.controller';

const router = Router();

// POST /api/ai/assistant
router.post('/assistant', generateResponse);

export default router;
