import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { activateSubscription, calcTermAmount, PLAN_RATES, PlanType, topUpStudents } from '../services/subscription.service';
import { getCurrentTerm, listAllTerms } from '../services/term.service';

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
        res.status(500).json({ message: err.message });
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
        res.status(500).json({ message: err.message });
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
        res.status(500).json({ message: err.message });
    }
};
