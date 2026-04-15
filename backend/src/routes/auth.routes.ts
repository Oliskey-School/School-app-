import { Router } from 'express';
import * as AuthController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiter for demo endpoints — stricter than global limit
const demoLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many demo login attempts, please try again later.' },
});

// [FIX] Robust routing for demo login — group methods and add diagnostics
router.route('/demo/login')
    .options((req, res) => {
        res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.status(204).end();
    })
    .post(demoLimiter, AuthController.demoLogin)
    .get((req, res) => {
        console.warn(`⚠️ [AUTH] GET request to /demo/login from ${req.ip}`);
        res.status(405).json({ 
            error: 'Method Not Allowed', 
            message: 'Please use POST for demo login',
            suggestion: 'The demo login requires a POST request with a role in the body.'
        });
    })
    .all((req, res) => {
        console.error(`🚨 [AUTH] Unsupported ${req.method} request to /demo/login from ${req.ip}`);
        res.status(405).json({ 
            error: 'Method Not Allowed', 
            message: `Method ${req.method} is not supported for this endpoint.`,
            allowedMethods: ['POST', 'OPTIONS']
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
