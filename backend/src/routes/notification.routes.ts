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
        const { NotificationService } = await import('../services/notification.service');
        const { ids = [] } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) return res.json({ updated: 0 });
        // Shared (audience) notifications used to be skipped here (only rows
        // owned by the user were updated), so a school-wide notice could never
        // be marked read and the badge never cleared.
        const updated = await NotificationService.markReadForUser(req.user?.school_id, req.user?.id, ids);
        res.json({ updated });
    } catch (e: any) {
        // never pretend it worked
        res.status(500).json({ message: e?.message || 'Could not mark notifications as read' });
    }
});

// Platform Notifications (SaaS)
router.post('/platform', requireRole(['SUPER_ADMIN']), createPlatformNotification);
router.get('/platform/all', requireRole(['SUPER_ADMIN']), getAllPlatformNotifications);
router.get('/platform/my', getMyPlatformNotifications);

// Settings
router.get('/settings', getNotificationSettings);
router.put('/settings', updateNotificationSettings);

export default router;
