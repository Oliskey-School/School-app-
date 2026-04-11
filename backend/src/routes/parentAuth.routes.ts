import { Router } from 'express';
import { ParentAuthController } from '../controllers/parentAuth.controller';

const router = Router();

// Email verification routes
router.post('/verify-email/send', ParentAuthController.sendVerificationEmail);
router.post('/verify-email', ParentAuthController.verifyEmail);
router.post('/verify-email/resend', ParentAuthController.resendVerificationCode);
router.get('/verify-email/status/:email', ParentAuthController.checkVerificationStatus);

// Login eligibility check
router.post('/check-eligibility', ParentAuthController.checkLoginEligibility);

export default router;
