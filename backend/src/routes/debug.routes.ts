import { Router } from 'express';
import { TestOTPStore } from '../services/test-otp.store';
import prisma from '../config/database';

const router = Router();

// 🚨 TESTING ONLY: This route is only registered in non-production environments
router.get('/latest-otp/:email', (req, res) => {
    const { email } = req.params;
    const otp = TestOTPStore.get(email);

    if (!otp) {
        return res.status(404).json({ message: 'No OTP found for this email' });
    }

    res.json({ otp });
});

// 🚨 TESTING ONLY: password-reset codes are stored in VerificationCode, not
// TestOTPStore — this reads them back the same way for E2E coverage of forgot-password.
router.get('/latest-reset-code/:email', async (req, res) => {
    const { email } = req.params;
    const rec = await (prisma as any).verificationCode.findFirst({
        where: { email: email.toLowerCase(), purpose: 'password_reset' },
        orderBy: { created_at: 'desc' },
    });

    if (!rec) {
        return res.status(404).json({ message: 'No reset code found for this email' });
    }

    res.json({ code: rec.code });
});

export default router;
