import { Router } from 'express';
import { TestOTPStore } from '../services/test-otp.store';

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

export default router;
