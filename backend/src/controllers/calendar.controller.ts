import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { CalendarService } from '../services/calendar.service';
import { getEffectiveBranchId } from '../utils/branchScope';

export const getCalendarEvents = async (req: AuthRequest, res: Response) => {
    try {
        const parentId = (req.user as any).role === 'PARENT' ? req.user.id : undefined;
        const branchId = getEffectiveBranchId(req.user, (req.query.branch_id || req.query.branchId) as string);
        const result = await CalendarService.getCalendarEvents(req.user.school_id, branchId, parentId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const rsvpToEvent = async (req: AuthRequest, res: Response) => {
    try {
        const { eventId, status } = req.body;
        if (!eventId || !status) throw new Error('Missing required fields');

        const result = await CalendarService.rsvpToEvent(req.user.school_id, eventId, req.user.id, status);
        res.json(result);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

const ADMIN_ROLES = ['admin', 'proprietor', 'superadmin', 'super_admin'];

export const createCalendarEvent = async (req: AuthRequest, res: Response) => {
    try {
        if (!ADMIN_ROLES.includes((req.user.role || '').toLowerCase())) return res.status(403).json({ message: 'Only admins can create calendar events' });
        const branchId = getEffectiveBranchId(req.user, req.body.branch_id);
        const result = await CalendarService.createCalendarEvent(req.user.school_id, branchId, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateCalendarEvent = async (req: AuthRequest, res: Response) => {
    try {
        if (!ADMIN_ROLES.includes((req.user.role || '').toLowerCase())) return res.status(403).json({ message: 'Only admins can update calendar events' });
        const result = await CalendarService.updateCalendarEvent(req.user.school_id, req.params.id as string, req.body);
        res.json(result);
    } catch (error: any) {
        res.status(/not found/i.test(error.message) ? 404 : 500).json({ message: error.message });
    }
};

export const deleteCalendarEvent = async (req: AuthRequest, res: Response) => {
    try {
        if (!ADMIN_ROLES.includes((req.user.role || '').toLowerCase())) return res.status(403).json({ message: 'Only admins can delete calendar events' });
        const result = await CalendarService.deleteCalendarEvent(req.user.school_id, req.params.id as string);
        res.json(result);
    } catch (error: any) {
        res.status(/not found/i.test(error.message) ? 404 : 500).json({ message: error.message });
    }
};
