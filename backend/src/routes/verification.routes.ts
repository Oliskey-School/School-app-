import { Router } from 'express';
import { VerificationController } from '../controllers/verification.controller';
import { authenticate } from '../middleware/auth.middleware';
import { VerificationService } from '../services/verification.service';

const router = Router();

// Verification status for the currently authenticated user.
router.get('/', authenticate, async (req: any, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });
        const isVerified = await VerificationService.isEmailVerified(userId);
        res.json({
            success: true,
            email: req.user?.email,
            email_verified: isVerified
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/send', VerificationController.sendVerificationCode);
router.post('/verify', VerificationController.verifyCode);
router.post('/resend', VerificationController.resendCode);
router.get('/status/:email', VerificationController.checkStatus);

export default router;
