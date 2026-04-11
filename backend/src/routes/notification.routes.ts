import { Router } from 'express';
import { 
    createNotification, 
    getMyNotifications, 
    markAsRead,
    createPlatformNotification,
    getAllPlatformNotifications,
    getMyPlatformNotifications
} from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate);

// Standard Notifications
router.post('/', createNotification);
router.get('/', getMyNotifications);
router.get('/me', getMyNotifications);
router.put('/:id/read', markAsRead);

// Platform Notifications (SaaS)
router.post('/platform', requireRole(['SUPER_ADMIN']), createPlatformNotification);
router.get('/platform/all', requireRole(['SUPER_ADMIN']), getAllPlatformNotifications);
router.get('/platform/my', getMyPlatformNotifications);

export default router;
