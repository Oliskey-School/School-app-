import { Router } from 'express';
import { platformContext } from '../lib/tenantContext';
import { createSchoolOnboard, checkSchoolCode } from '../controllers/onboarding.controller';

const router = Router();
// Public / cross-school endpoints: explicit platform scope (see lib/tenantContext.ts).
router.use(platformContext);

// Public endpoints — no auth required (pre-signup flows)
router.get('/onboard/check-code', checkSchoolCode);
router.post('/onboard', createSchoolOnboard);

export default router;
