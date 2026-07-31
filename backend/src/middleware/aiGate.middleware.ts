import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import prisma from '../config/database';
import { config } from '../config/env';

/**
 * Server-side mirror of hooks/useSubscriptionGate.ts's isAIAllowed check.
 * The frontend already blocks AI calls for non-Advanced schools, but that's
 * only a UI courtesy — nothing stopped a user from calling these endpoints
 * directly and running real (billable) NVIDIA requests regardless of plan.
 */
export const requireAIAllowed = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user?.school_id) return res.status(401).json({ message: 'Unauthorized' });

    // Demo school always gets Advanced privileges, matching the frontend gate.
    if (user.school_id === config.demoSchoolId) return next();

    const school = await prisma.school.findUnique({
        where: { id: user.school_id },
        select: { plan_type: true, subscription_status: true, settings: true, current_term: true, academic_session: true },
    });
    if (!school) return res.status(401).json({ message: 'Unauthorized' });

    if (school.plan_type === 'advanced' && school.subscription_status === 'active') {
        return next();
    }

    // Per-user self-pay: a user who bought AI for THIS term keeps AI access
    // even though the school itself isn't on Advanced.
    try {
        const settings: any = school.settings;
        const rec = settings?.ai_self_paid?.[user.id];
        if (rec
            && String(rec.term) === String(school.current_term)
            && String(rec.session) === String(school.academic_session)) {
            return next();
        }
    } catch { /* malformed settings — fall through to locked */ }

    return res.status(403).json({ message: 'AI tools are on the Advanced plan. Upgrade to Advanced to use this feature.' });
};
