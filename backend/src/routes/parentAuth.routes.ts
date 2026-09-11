import { Router } from 'express';
import { ParentAuthController } from '../controllers/parentAuth.controller';
import { otpLimiter } from '../middleware/rateLimiters';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Email verification routes
router.post('/verify-email/send', otpLimiter, ParentAuthController.sendVerificationEmail);
router.post('/verify-email', otpLimiter, ParentAuthController.verifyEmail);
router.post('/verify-email/resend', otpLimiter, ParentAuthController.resendVerificationCode);
// Self-only: see ParentAuthController.checkVerificationStatus for why this is authenticated.
router.get('/verify-email/status/:email', authenticate, ParentAuthController.checkVerificationStatus);

// Login eligibility check
router.post('/check-eligibility', otpLimiter, ParentAuthController.checkLoginEligibility);

export default router;
