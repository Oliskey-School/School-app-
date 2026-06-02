import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as pwaService from '../services/pwa.service';

/**
 * POST /api/pwa/events — record an interaction with the install prompt.
 * Body: { action: string, platform?: string }
 */
export async function recordEventController(req: AuthRequest, res: Response) {
    try {
        const user = req.user;
        if (!user?.id) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }

        const { action, platform } = req.body || {};

        await pwaService.recordEvent({
            user_id: user.id,
            school_id: user.school_id ?? req.school_id ?? null,
            branch_id: user.branch_id ?? req.branch_id ?? null,
            action,
            platform: platform ?? null,
            user_agent: (req.headers['user-agent'] as string) || null,
        });

        return res.status(201).json({ success: true });
    } catch (err: any) {
        const status = err?.status || 500;
        if (status >= 500) {
            console.error('[PWA] recordEvent failed:', err?.message || err);
        }
        return res.status(status).json({
            success: false,
            message: err?.message || 'Failed to record PWA event',
        });
    }
}

/**
 * GET /api/pwa/status — whether this user has installed or recently dismissed
 * the prompt (used to keep the prompt hidden across the user's devices).
 */
export async function getStatusController(req: AuthRequest, res: Response) {
    try {
        const user = req.user;
        if (!user?.id) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        const status = await pwaService.getStatus(user.id);
        return res.json(status);
    } catch (err: any) {
        console.error('[PWA] getStatus failed:', err?.message || err);
        return res.status(500).json({ message: 'Failed to get PWA status' });
    }
}
