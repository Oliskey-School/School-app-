import { Router } from 'express';
import { createSchoolOnboard } from '../controllers/onboarding.controller';

const router = Router();

// Public endpoint — no auth required (this is the sign-up flow)
router.post('/onboard', createSchoolOnboard);

export default router;
