import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { NotificationService } from '../services/notification.service';
import { channelAvailability } from '../services/notificationPreferences';
import { toCategoryId, NotificationDeliveryService } from '../services/notificationDelivery.service';
import { getEffectiveBranchId } from '../utils/branchScope';
import prisma from '../config/database';
import { sendError } from '../utils/httpError';

export const createNotification = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id || req.body.branchId);

        // This endpoint is deliberately open to every authenticated role —
        // parents/students/teachers all trigger contextual notifications
        // from legitimate flows (appointment booking, assignment posted,
        // etc.) — but the target user_id/recipient_id was never checked
        // against the caller's own school. That let any authenticated user
        // send an arbitrary title/message to ANY user_id in the database,
        // including users belonging to a completely different school
        // (verified live: a demo student successfully created a notification
        // targeting the demo admin's user_id with no relationship at all).
        // Multi-tenant isolation requires the target to be in the caller's
        // own school; branch is left unchecked since main-branch admins and
        // multi-branch teachers/parents legitimately message other branches.
        const targetUserId = req.body.user_id || req.body.recipient_id;
        if (targetUserId) {
            const targetUser = await prisma.user.findFirst({
                where: { id: targetUserId, school_id: req.user.school_id },
                select: { id: true },
            });
            if (!targetUser) {
                return res.status(403).json({ message: 'Recipient not found in your school' });
            }
        }

        // A notification aimed at ONE person goes through the delivery service, so
        // that person's choices on the Notification Digest screen actually apply:
        // "Off" suppresses it, "Digest" holds it for their daily summary, and the
        // chosen channel (in-app / email) is used. Before this, those preferences
        // were stored and then ignored — every notification was written in-app and
        // emitted immediately regardless.
        //
        // Broadcasts (no single recipient) keep the direct path: there is no one
        // set of preferences to apply to a whole-school announcement.
        if (targetUserId) {
            const delivery = await NotificationDeliveryService.deliver({
                schoolId: req.user.school_id,
                branchId,
                userId: targetUserId,
                category: toCategoryId(req.body.category),
                title: req.body.title,
                message: req.body.message || req.body.summary || 'No details provided.',
            });
            return res.status(201).json({ ok: true, ...delivery });
        }

        const result = await NotificationService.createNotification(req.user.school_id, branchId, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        sendError(res, error, 'notification.controller.ts');
    }
};

export const getMyNotifications = async (req: AuthRequest, res: Response) => {
    try {
        // Audience values are stored in whatever case the sender used
        // ('student' from the app, 'STUDENT' from the token). Matching only the
        // token's spelling hid every school-wide notice from students.
        const role = String(req.user.role || '');
        const audience = Array.from(new Set([role, role.toLowerCase(), role.toUpperCase(), role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()].filter(Boolean)));
        const branchId = getEffectiveBranchId(req.user, (req.query.branchId || req.query.branch_id) as string);
        const result = await NotificationService.getNotificationsForUser(req.user.school_id, branchId, req.user.id, audience);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'notification.controller.ts');
    }
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id || req.body.branchId);
        const result = await NotificationService.markAsRead(req.user.school_id, branchId, req.params.id as string, req.user.id);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'notification.controller.ts');
    }
};

export const createPlatformNotification = async (req: AuthRequest, res: Response) => {
    try {
        const result = await NotificationService.createPlatformNotification({
            ...req.body,
            createdBy: req.user.id
        });
        res.status(201).json(result);
    } catch (error: any) {
        sendError(res, error, 'notification.controller.ts');
    }
};

export const getAllPlatformNotifications = async (req: AuthRequest, res: Response) => {
    try {
        const result = await NotificationService.getAllPlatformNotifications();
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'notification.controller.ts');
    }
};

export const getMyPlatformNotifications = async (req: AuthRequest, res: Response) => {
    try {
        const result = await NotificationService.getPlatformNotificationsForSchool(req.user.school_id);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'notification.controller.ts');
    }
};

export const getNotificationSettings = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.id;
        const result = await NotificationService.getSettingsByUserId(userId);
        // Return the whole preference set. This used to return `result.categories`
        // — the inner blob — so the client's `settings.digest_time` and
        // `settings.categories` were both undefined and nothing ever restored.
        // `channels` tells the UI which delivery channels this deployment can
        // actually use, so it can mark the rest unavailable instead of offering
        // options that would silently drop the message.
        res.json({ ...result, channels: channelAvailability() });
    } catch (error: any) {
        sendError(res, error, 'notification.controller.ts');
    }
};

export const updateNotificationSettings = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.id;
        const result = await NotificationService.updateSettingsByUserId(
            userId,
            req.body,
            req.user.school_id,
            (req.user as any).active_branch_id ?? req.user.branch_id ?? null
        );
        res.json({ ...result, channels: channelAvailability() });
    } catch (error: any) {
        sendError(res, error, 'notification.controller.ts');
    }
};
