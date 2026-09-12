import { Router } from 'express';
import { TestOTPStore } from '../services/test-otp.store';

const router = Router();

// 🚨 TESTING ONLY: This route is only registered in non-production environments
// (see routes/index.ts — NODE_ENV != production AND ENABLE_DEBUG_ROUTES=true).
router.get('/latest-otp/:email', (req, res) => {
    const { email } = req.params;
    const otp = TestOTPStore.get(email);

    if (!otp) {
        return res.status(404).json({ message: 'No OTP found for this email' });
    }

    res.json({ otp });
});

// 🚨 TESTING ONLY: password-reset codes used to be stored in plain text in
// VerificationCode, which is what this route originally read back. That
// storage is now bcrypt-hashed (see VerificationService.createVerification,
// which both purposes go through), so reading VerificationCode.code here
// would return the hash, not the code — this route would silently start
// handing back unusable garbage instead of erroring. TestOTPStore holds the
// plain code for E2E readback regardless of purpose; read from there, same
// as /latest-otp above.
router.get('/latest-reset-code/:email', (req, res) => {
    const { email } = req.params;
    const code = TestOTPStore.get(email);

    if (!code) {
        return res.status(404).json({ message: 'No reset code found for this email' });
    }

    res.json({ code });
});

export default router;
