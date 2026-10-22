import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ReferralService } from '../services/referral.service';
import { sendError } from '../utils/httpError';

// Every handler takes the tenant from the verified token only (req.user).
// Nothing here reads school_id / branch_id from the query string or body.

export const createReferral = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.school_id) return res.status(401).json({ message: 'Tenant context missing' });
        const referral = await ReferralService.createForParent(req.user, req.body);
        res.status(201).json(referral);
    } catch (error: any) {
        sendError(res, error, 'referral.controller.ts');
    }
};

export const getMyReferrals = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.school_id) return res.status(401).json({ message: 'Tenant context missing' });
        res.json(await ReferralService.listForParent(req.user));
    } catch (error: any) {
        sendError(res, error, 'referral.controller.ts');
    }
};

export const getStaffReferrals = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.school_id) return res.status(401).json({ message: 'Tenant context missing' });
        res.json(await ReferralService.listForStaff(req.user));
    } catch (error: any) {
        sendError(res, error, 'referral.controller.ts');
    }
};

export const updateReferral = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.school_id) return res.status(401).json({ message: 'Tenant context missing' });
        const referral = await ReferralService.updateByStaff(req.user, String(req.params.id), req.body, {
            ip: req.ip,
            userAgent: req.headers['user-agent'] as string | undefined,
        });
        res.json(referral);
    } catch (error: any) {
        sendError(res, error, 'referral.controller.ts');
    }
};
