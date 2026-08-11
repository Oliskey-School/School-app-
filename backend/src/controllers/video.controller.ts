import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { VideoService } from '../services/video.service';
import prisma from '../config/database';
import { getEffectiveBranchId } from '../utils/branchScope';

/**
 * Tells the frontend whether server-side video calling (Daily) is available,
 * so it can pick a provider without ever seeing the API key.
 */
export const getVideoStatus = async (_req: AuthRequest, res: Response) => {
    res.json({ configured: VideoService.isConfigured(), provider: 'daily' });
};

/**
 * Mints (or reuses) the video room for a virtual class session and returns the
 * join URL.
 *
 * Tenant scoping: the session is looked up with school_id from the caller's own
 * JWT, so a user can only ever get a room for a session inside their own school
 * — a known session id from another tenant resolves to "not found" rather than
 * handing out a working room URL.
 */
export const createVideoRoom = async (req: AuthRequest, res: Response) => {
    try {
        const sessionId = (req.body?.session_id || req.body?.sessionId) as string;
        if (!sessionId) {
            return res.status(400).json({ message: 'session_id is required' });
        }

        const branchId = getEffectiveBranchId(req.user);
        const session = await prisma.virtualClassSession.findFirst({
            where: { id: sessionId, school_id: req.user.school_id, ...(branchId ? { branch_id: branchId } : {}), deleted_at: null },
            select: { id: true, start_time: true, end_time: true },
        });
        if (!session) {
            return res.status(404).json({ message: 'Class session not found' });
        }

        // Keep the room alive for the remainder of the class (plus a small
        // buffer), falling back to a sane default when no end time was set.
        let durationMinutes = 240;
        if (session.end_time) {
            const remaining = Math.ceil((new Date(session.end_time).getTime() - Date.now()) / 60000);
            durationMinutes = Math.min(Math.max(remaining + 15, 15), 1440);
        }

        const room = await VideoService.getOrCreateRoom(session.id, durationMinutes);
        res.json(room);
    } catch (error: any) {
        const status = error?.status && error.status >= 400 && error.status < 600 ? error.status : 500;
        if (process.env.NODE_ENV !== 'production' && error?.detail) {
            console.error('[VideoController]', error.message, error.detail);
        }
        res.status(status).json({ message: error.message || 'Could not start the class room' });
    }
};
