import { Router } from 'express';
import { createNotification, getMyNotifications, markAsRead } from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.post('/', createNotification);
router.get('/me', getMyNotifications);
router.put('/:id/read', markAsRead);

export default router;
