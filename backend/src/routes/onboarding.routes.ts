import { Router } from 'express';
import { createSchoolOnboard, checkSchoolCode } from '../controllers/onboarding.controller';

const router = Router();

// Public endpoints — no auth required (pre-signup flows)
router.get('/onboard/check-code', checkSchoolCode);
router.post('/onboard', createSchoolOnboard);

export default router;
