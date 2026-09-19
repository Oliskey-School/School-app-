import { Router } from 'express';
import { platformContext } from '../lib/tenantContext';
import { ParentAuthController } from '../controllers/parentAuth.controller';
import { otpLimiter } from '../middleware/rateLimiters';

const router = Router();
// Public / cross-school endpoints: explicit platform scope (see lib/tenantContext.ts).
router.use(platformContext);

// Email verification routes
router.post('/verify-email/send', otpLimiter, ParentAuthController.sendVerificationEmail);
router.post('/verify-email', otpLimiter, ParentAuthController.verifyEmail);
router.post('/verify-email/resend', otpLimiter, ParentAuthController.resendVerificationCode);
router.get('/verify-email/status/:email', ParentAuthController.checkVerificationStatus);

// Login eligibility check
router.post('/check-eligibility', otpLimiter, ParentAuthController.checkLoginEligibility);

export default router;
