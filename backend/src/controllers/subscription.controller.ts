import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { activateSubscription, calcTermAmount, PLAN_RATES, PlanType, topUpStudents, recordUserAiPurchase, USER_AI_PRICE } from '../services/subscription.service';
import { getCurrentTerm, listAllTerms } from '../services/term.service';
import prisma from '../config/database';
import { sendError } from '../utils/httpError';

/**
 * GET /api/subscription/current-term
 * Public: anyone signed in can read the current term so the checkout UI can
 * label the period being paid for.
 */
export const getCurrentTermController = async (_req: AuthRequest, res: Response) => {
    try {
        const term = await getCurrentTerm(new Date());
        if (!term) {
            return res.json({ term: null, message: 'No active academic term configured' });
        }
        res.json({ term });
    } catch (err: any) {
        sendError(res, err, 'subscription.controller.ts');
    }
};

/**
 * GET /api/subscription/quote?plan=basic&students=150
 * Quote a term amount for a plan + student count without taking payment.
 */
export const getQuoteController = async (req: AuthRequest, res: Response) => {
    try {
        const plan = String(req.query.plan || '') as PlanType;
        const students = parseInt(String(req.query.students || '0'), 10);

        if (!(plan in PLAN_RATES)) {
            return res.status(400).json({ message: 'plan must be free | basic | advanced' });
        }
        if (!Number.isFinite(students) || students < 0) {
            return res.status(400).json({ message: 'students must be a non-negative integer' });
        }

        const rate = PLAN_RATES[plan];
        const total = calcTermAmount(plan, students);
        const term = await getCurrentTerm(new Date());

        res.json({ plan, rate, students, total, currency: 'NGN', term });
    } catch (err: any) {
        sendError(res, err, 'subscription.controller.ts');
    }
};

/**
 * POST /api/subscription/activate
 * Body: { plan_type, student_count, reference }
 * Verifies the Paystack transaction and snapshots the billing data on
 * the caller's school.
 */
export const activateSubscriptionController = async (req: AuthRequest, res: Response) => {
    try {
        const school_id = req.user?.school_id;
        if (!school_id) return res.status(403).json({ message: 'school context missing' });

        const { plan_type, student_count, reference } = req.body || {};

        if (typeof student_count !== 'number' || !Number.isInteger(student_count) || student_count < 0) {
            return res.status(400).json({ message: 'student_count must be a non-negative integer' });
        }

        const result = await activateSubscription({
            school_id,
            plan_type,
            student_count,
            reference,
        });
        res.json(result);
    } catch (err: any) {
        const isClientErr = /Invalid plan_type|required|less than required|Paystack/.test(err.message || '');
        res.status(isClientErr ? 400 : 500).json({ message: err.message });
    }
};

/**
 * POST /api/subscription/user-ai
 * Body: { reference }
 * A single user (parent/student/teacher) pays the Advanced−Basic difference (₦2,000) to
 * unlock AI for THEIR OWN account for the current term. Only valid while the school is on
 * Basic. Returns the per-user price too so the checkout UI can read it.
 */
export const purchaseUserAiController = async (req: AuthRequest, res: Response) => {
    try {
        const school_id = req.user?.school_id;
        const user_id = req.user?.id;
        if (!school_id || !user_id) return res.status(403).json({ message: 'auth context missing' });
        const { reference } = req.body || {};
        const result = await recordUserAiPurchase(school_id, user_id, reference);
        res.json({ ...result, price: USER_AI_PRICE });
    } catch (err: any) {
        const isClientErr = /Basic plan|required|less than required|Paystack|not found/i.test(err.message || '');
        res.status(isClientErr ? 400 : 500).json({ message: err.message });
    }
};

/**
 * POST /api/subscription/top-up
 * Body: { new_student_count }
 * Charges the saved Paystack auth for additional students mid-term. No proration.
 */
export const topUpController = async (req: AuthRequest, res: Response) => {
    try {
        const school_id = req.user?.school_id;
        if (!school_id) return res.status(403).json({ message: 'school context missing' });

        const { new_student_count } = req.body || {};
        if (typeof new_student_count !== 'number' || !Number.isInteger(new_student_count) || new_student_count < 0) {
            return res.status(400).json({ message: 'new_student_count must be a non-negative integer' });
        }

        const result = await topUpStudents({ school_id, new_student_count });
        res.json(result);
    } catch (err: any) {
        const isClientErr = /not active|saved payment|not available|not found|no contact/i.test(err.message || '');
        res.status(isClientErr ? 400 : 500).json({ message: err.message });
    }
};

/**
 * GET /api/subscription/academic-calendar
 * Read-only — exposes all term rows for SuperAdmin UI.
 */
export const listCalendarController = async (_req: AuthRequest, res: Response) => {
    try {
        const rows = await listAllTerms();
        res.json(rows);
    } catch (err: any) {
        sendError(res, err, 'subscription.controller.ts');
    }
};

/**
 * GET /api/subscription/all
 * SUPER_ADMIN only — the platform-wide subscription list for the SaaS
 * SubscriptionManagement screen. This endpoint did not exist, so that screen
 * 404'd and rendered an empty table forever.
 *
 * There is no separate Subscription table: a School *is* the subscription
 * (plan_id + subscription_status + billing period). We map it to the shape the
 * screen already expects and return null — never an invented date — for any
 * field the school genuinely has no value for.
 */
export const listAllSubscriptionsController = async (_req: AuthRequest, res: Response) => {
    try {
        // School has no deleted_at column (verified against the schema) — it uses
        // is_active instead, and the SaaS view intentionally lists every school
        // including suspended ones, so there is no filter here.
        const schools = await prisma.school.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                plan_id: true,
                plan_type: true,
                subscription_status: true,
                subscription_period_start: true,
                subscription_period_end: true,
                trial_ends_at: true,
                auto_renew: true,
                canceled_at: true,
                plan: { select: { name: true } }
            },
            orderBy: { name: 'asc' }
        });

        res.json(schools.map(s => ({
            // The screen PUTs back to /subscription/:id, and the school id is the
            // subscription's identity here.
            id: s.id,
            school_id: s.id,
            plan_id: s.plan_id,
            status: s.subscription_status,
            current_period_start: s.subscription_period_start,
            current_period_end: s.subscription_period_end,
            trial_ends_at: s.trial_ends_at,
            auto_renew: s.auto_renew,
            canceled_at: s.canceled_at,
            school_name: s.name,
            contact_email: s.email,
            plan_name: s.plan?.name || s.plan_type || null
        })));
    } catch (err: any) {
        console.error('[Subscription] listAll failed:', err);
        res.status(500).json({ message: 'Failed to load subscriptions' });
    }
};

/**
 * PUT /api/subscription/:id
 * SUPER_ADMIN only — used by the SaaS screen to cancel/adjust a school's
 * subscription. Only the subscription fields are writable; nothing else about
 * the school can be changed through here.
 */
export const updateSubscriptionController = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.params.id as string;
        const { status, auto_renew, canceled_at, current_period_end } = req.body || {};

        const ALLOWED_STATUSES = ['active', 'trial', 'past_due', 'canceled', 'expired', 'suspended', 'free'];
        const data: any = {};

        if (status !== undefined) {
            if (!ALLOWED_STATUSES.includes(String(status))) {
                return res.status(400).json({ message: `status must be one of: ${ALLOWED_STATUSES.join(', ')}` });
            }
            data.subscription_status = String(status);
        }
        if (auto_renew !== undefined) data.auto_renew = !!auto_renew;
        if (canceled_at !== undefined) data.canceled_at = canceled_at ? new Date(canceled_at) : null;
        if (current_period_end !== undefined) data.subscription_period_end = current_period_end ? new Date(current_period_end) : null;

        if (Object.keys(data).length === 0) {
            return res.status(400).json({ message: 'No subscription fields supplied' });
        }

        const existing = await prisma.school.findFirst({ where: { id: schoolId }, select: { id: true } });
        if (!existing) return res.status(404).json({ message: 'School not found' });

        const updated = await prisma.school.update({
            where: { id: schoolId },
            data,
            select: {
                id: true,
                subscription_status: true,
                auto_renew: true,
                canceled_at: true,
                subscription_period_end: true
            }
        });

        res.json({
            id: updated.id,
            school_id: updated.id,
            status: updated.subscription_status,
            auto_renew: updated.auto_renew,
            canceled_at: updated.canceled_at,
            current_period_end: updated.subscription_period_end
        });
    } catch (err: any) {
        console.error('[Subscription] update failed:', err);
        res.status(500).json({ message: 'Failed to update subscription' });
    }
};
