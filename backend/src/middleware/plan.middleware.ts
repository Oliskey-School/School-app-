import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import prisma from '../config/database';

type ResourceType = 'student' | 'teacher';

const PLAN_LIMITS: Record<string, { student: number; teacher: number }> = {
    free: { student: 50, teacher: 5 },
    pro: { student: 500, teacher: 50 },
    enterprise: { student: 10000, teacher: 1000 },
};

export const requirePlanCapacity =
    (resource: ResourceType) =>
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        // Temporarily disabled as requested
        return next();
        
        const schoolId = req.user?.school_id;
        if (!schoolId) {
            return res.status(400).json({ message: 'School context missing.' });
        }

        // Demo school is always unrestricted
        if (schoolId === 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1') {
            return next();
        }

        try {
            // 1. Get school plan
            const school = await prisma.school.findUnique({
                where: { id: schoolId },
                select: { plan_type: true, subscription_status: true }
            });

            if (!school) {
                return res.status(404).json({ message: 'School not found.' });
            }

            const plan = school.plan_type?.toLowerCase() || 'free';
            const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
            const limit = resource === 'student' ? limits.student : limits.teacher;

            // 2. Count current usage
            let current = 0;
            if (resource === 'student') {
                current = await prisma.student.count({ where: { school_id: schoolId } });
            } else {
                current = await prisma.teacher.count({ where: { school_id: schoolId } });
            }

            if (current >= limit) {
                return res.status(402).json({
                    message: `${resource.charAt(0).toUpperCase() + resource.slice(1)} limit reached for your ${plan} plan.`,
                    plan_limit_exceeded: true,
                    resource,
                    current,
                    limit,
                    effective_plan: plan,
                    upgrade_required: plan === 'free' || school.subscription_status === 'expired',
                });
            }

            next();
        } catch (err: any) {
            console.error('[PlanMiddleware] Exception:', err.message);
            next(); // fail open
        }
    };
