/**
 * Plan Gate Middleware
 *
 * Checks whether the authenticated school can perform a resource-creating
 * action (enrolling a student, adding a teacher) against the current plan
 * limits returned by get_plan_status().
 *
 * Usage in a route:
 *   router.post('/enroll', authenticate, requirePlanCapacity('student'), enrollStudent);
 *   router.post('/',       authenticate, requirePlanCapacity('teacher'), createTeacher);
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config/env';

const getAdminClient = () =>
    createClient(config.supabaseUrl, config.supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

type ResourceType = 'student' | 'teacher';

export const requirePlanCapacity =
    (resource: ResourceType) =>
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        const schoolId = req.user?.school_id;
        if (!schoolId) {
            return res.status(400).json({ message: 'School context missing.' });
        }

        // Demo school is always unrestricted
        if (schoolId === 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1') {
            return next();
        }

        try {
            const supabase = getAdminClient();
            const { data, error } = await supabase.rpc('get_plan_status', {
                p_school_id: schoolId,
            });

            if (error) {
                console.error('[PlanMiddleware] RPC error:', error.message);
                // Fail open — don't block on plan check errors
                return next();
            }

            const canAdd = resource === 'student' ? data.can_add_student : data.can_add_teacher;
            if (!canAdd) {
                const limit = resource === 'student'
                    ? data.limits.max_students
                    : data.limits.max_teachers;
                const current = resource === 'student'
                    ? data.usage.students
                    : data.usage.teachers;

                return res.status(402).json({
                    message: `${resource.charAt(0).toUpperCase() + resource.slice(1)} limit reached for your plan.`,
                    plan_limit_exceeded: true,
                    resource,
                    current,
                    limit,
                    effective_plan: data.effective_plan,
                    upgrade_required: data.effective_plan === 'free' || data.is_expired,
                });
            }

            next();
        } catch (err: any) {
            console.error('[PlanMiddleware] Exception:', err.message);
            next(); // fail open
        }
    };
