import { Router } from 'express';
import * as AuthController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/signup', AuthController.signup);
router.post('/login', AuthController.login);
router.post('/create-user', AuthController.createUser);

// Verify token endpoint
router.get('/verify', authenticate, (req, res) => {
    res.json({ message: 'Valid token', user: (req as any).user });
});

export default router;
