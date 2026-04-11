import { Router } from 'express';
import { VerificationController } from '../controllers/verification.controller';

const router = Router();

router.post('/send', VerificationController.sendVerificationCode);
router.post('/verify', VerificationController.verifyCode);
router.post('/resend', VerificationController.resendCode);
router.get('/status/:email', VerificationController.checkStatus);

export default router;
