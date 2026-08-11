import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { NotificationService } from '../services/notification.service';
import { getEffectiveBranchId } from '../utils/branchScope';
import prisma from '../config/database';

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

        const result = await NotificationService.createNotification(req.user.school_id, branchId, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getMyNotifications = async (req: AuthRequest, res: Response) => {
    try {
        const audience = [req.user.role];
        const branchId = getEffectiveBranchId(req.user, (req.query.branchId || req.query.branch_id) as string);
        const result = await NotificationService.getNotificationsForUser(req.user.school_id, branchId, req.user.id, audience);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id || req.body.branchId);
        const result = await NotificationService.markAsRead(req.user.school_id, branchId, req.params.id as string);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
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
        res.status(500).json({ message: error.message });
    }
};

export const getAllPlatformNotifications = async (req: AuthRequest, res: Response) => {
    try {
        const result = await NotificationService.getAllPlatformNotifications();
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getMyPlatformNotifications = async (req: AuthRequest, res: Response) => {
    try {
        const result = await NotificationService.getPlatformNotificationsForSchool(req.user.school_id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getNotificationSettings = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.id;
        const result = await NotificationService.getSettingsByUserId(userId);
        res.json(result.categories);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
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
        res.json(result.categories);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
