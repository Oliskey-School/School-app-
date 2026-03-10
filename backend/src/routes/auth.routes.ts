import { Router } from 'express';
import * as AuthController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/signup', AuthController.signup);
router.post('/login', AuthController.login);
router.post('/create-user', AuthController.createUser);
router.post('/resend-verification', AuthController.resendVerification);
router.post('/confirm-email', AuthController.confirmEmail);
router.patch('/update-email', AuthController.updateEmail);
router.patch('/update-username', AuthController.updateUsername);
router.patch('/update-password', AuthController.updatePassword);
router.get('/memberships', authenticate, AuthController.getMemberships);
router.post('/switch-school', authenticate, AuthController.switchSchool);

// Verify token endpoint
router.get('/verify', authenticate, (req, res) => {
    res.json({ message: 'Valid token', user: (req as any).user });
});

export default router;
