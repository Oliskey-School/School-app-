import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { NotificationService } from '../services/notification.service';
import { getEffectiveBranchId } from '../utils/branchScope';

export const createNotification = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id || req.body.branchId);
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
        const result = await NotificationService.updateSettingsByUserId(userId, req.body);
        res.json(result.categories);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
