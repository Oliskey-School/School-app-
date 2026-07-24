import { Router } from 'express';
import { 
    createNotification, 
    getMyNotifications, 
    markAsRead,
    createPlatformNotification,
    getAllPlatformNotifications,
    getMyPlatformNotifications,
    getNotificationSettings,
    updateNotificationSettings
} from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate);

// Diagnostic Logging
router.use((req, res, next) => {
    console.log(`🔔 [NotificationRoutes] Incoming: ${req.method} ${req.url}`);
    next();
});

// Standard Notifications
router.post('/', createNotification);
router.get('/', getMyNotifications);
router.get('/me', getMyNotifications);
router.put('/:id/read', markAsRead);

// Bulk mark-read — frontend sends PUT /notifications/mark-read { ids: [...] }
router.put('/mark-read', async (req: any, res) => {
    try {
        const { default: prisma } = await import('../config/database');
        const { ids = [] } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) return res.json({ updated: 0 });
        const result = await (prisma as any).notification.updateMany({
            where: {
                id: { in: ids.map(String) },
                school_id: req.user?.school_id,
                user_id: req.user?.id,
            },
            data: { is_read: true },
        }).catch(() => ({ count: 0 }));
        res.json({ updated: result.count ?? ids.length });
    } catch (e: any) { res.json({ updated: 0 }); }
});

// Platform Notifications (SaaS)
router.post('/platform', requireRole(['SUPER_ADMIN']), createPlatformNotification);
router.get('/platform/all', requireRole(['SUPER_ADMIN']), getAllPlatformNotifications);
router.get('/platform/my', getMyPlatformNotifications);

// Settings
router.get('/settings', getNotificationSettings);
router.put('/settings', updateNotificationSettings);

export default router;
