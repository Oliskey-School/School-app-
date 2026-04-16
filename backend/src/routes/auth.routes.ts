import { Router } from 'express';
import * as AuthController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiter for demo endpoints — stricter than global limit
const demoLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 1000, // Increased from 30 to 1000 to prevent 429 during active testing
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many demo login attempts, please try again later.' },
});

// Demo login endpoint — POST for authentication
router.post('/demo/login', demoLimiter, AuthController.demoLogin);

// Add descriptive error for GET/HEAD on login endpoint to help debug
router.get('/demo/login', (req, res) => {
    res.status(405).json({
        error: 'Method Not Allowed',
        message: 'Demo login requires a POST request with a role in the body.',
        hint: 'Use POST /api/auth/demo/login instead of GET.'
    });
});
router.get('/demo/roles', demoLimiter, AuthController.demoRoles);

router.post('/signup', AuthController.signup);
router.post('/login', AuthController.login);
router.post('/google-login', AuthController.googleLogin);
router.post('/create-user', AuthController.createUser);
router.post('/resend-verification', AuthController.resendVerification);
router.post('/confirm-email', AuthController.confirmEmail);
router.post('/verify-email', AuthController.verifyEmail);
router.patch('/update-email', AuthController.updateEmail);
router.patch('/update-username', AuthController.updateUsername);
router.patch('/update-password', authenticate, AuthController.updatePassword);
router.post('/admin/change-password', authenticate, AuthController.adminChangePassword);
router.post('/admin/reset-password', authenticate, AuthController.resetUserPassword);
router.get('/memberships/:userId', authenticate, AuthController.getMemberships);
router.post('/switch-school', authenticate, AuthController.switchSchool);

router.get('/me', authenticate, AuthController.getMe);
router.get('/check-email', AuthController.checkEmail);
router.get('/check-username', AuthController.checkUsername);

// Session management
router.get('/sessions', authenticate, AuthController.getSessions);
router.delete('/sessions/:sessionId', authenticate, AuthController.revokeSession);
router.delete('/sessions', authenticate, AuthController.revokeAllSessions);

// Verify token endpoint
router.get('/verify', authenticate, (req, res) => {
    res.json({ message: 'Valid token', user: (req as any).user });
});

export default router;
