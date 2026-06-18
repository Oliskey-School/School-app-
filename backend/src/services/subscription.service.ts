import prisma from '../config/database';
import { getCurrentTerm } from './term.service';
import { SubscriptionEmailService } from './subscriptionEmail.service';
import { generateInvoicePdf } from './subscriptionInvoice.service';

const PAYSTACK_BASE = 'https://api.paystack.co';

export const PLAN_RATES: Record<'free' | 'basic' | 'advanced', number> = {
    free: 0,
    basic: 1000,    // ₦1,000 per child per term
    advanced: 3000, // ₦3,000 per child per term
};

export type PlanType = keyof typeof PLAN_RATES;

export function calcTermAmount(plan: PlanType, studentCount: number): number {
    if (plan === 'free') return 0;
    return PLAN_RATES[plan] * Math.max(0, studentCount);
}

/**
 * What the school actually pays for a plan change THIS term. Upgrading Basic → Advanced
 * credits what they already paid for Basic, so they only pay the difference
 * (₦3,000 − ₦1,000 = ₦2,000 per child). Every other change pays the plan's full amount.
 */
export function calcChargeAmount(currentPlan: PlanType, newPlan: PlanType, studentCount: number, alreadyAiPaidUsers = 0): number {
    const target = calcTermAmount(newPlan, studentCount);
    if (currentPlan === 'basic' && newPlan === 'advanced') {
        const credit = calcTermAmount('basic', studentCount);
        const base = Math.max(0, target - credit); // (Advanced − Basic) × students
        // Credit the admin for users who already self-paid for AI this term: they are
        // subtracted from the count the admin pays for (no refunds).
        return Math.max(0, base - USER_AI_PRICE * Math.max(0, alreadyAiPaidUsers));
    }
    return target;
}

/** A single user tops up the Basic→Advanced difference to unlock AI for THEIR account. */
export const USER_AI_PRICE = PLAN_RATES.advanced - PLAN_RATES.basic; // ₦2,000 per term

function readSettings(school: any): any {
    try {
        return (typeof school?.settings === 'string' ? JSON.parse(school.settings) : school?.settings) || {};
    } catch { return {}; }
}

/** How many users already self-paid for AI for the school's CURRENT term. */
export function countSelfPaidAiForTerm(school: any): number {
    const map = readSettings(school).ai_self_paid || {};
    let n = 0;
    for (const k of Object.keys(map)) {
        const r = map[k];
        if (r && String(r.term) === String(school?.current_term) && String(r.session) === String(school?.academic_session)) n += 1;
    }
    return n;
}

/**
 * Record a single user (parent/student/teacher) buying AI for their own account for the
 * current term. Only allowed while the school is on Basic (they pay the Advanced − Basic
 * difference). Stored in school.settings.ai_self_paid so the per-user gate can read it.
 */
export async function recordUserAiPurchase(schoolId: string, userId: string, reference: string) {
    if (!schoolId || !userId) throw new Error('schoolId and userId are required');
    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) throw new Error('School not found');
    if (school.plan_type !== 'basic') {
        throw new Error('Self-pay for AI is only available while the school is on the Basic plan.');
    }
    if (!reference) throw new Error('reference is required');
    const tx = await verifyPaystackTransaction(reference);
    const amountPaid = Math.floor((tx!.amount || 0) / 100);
    if (amountPaid < USER_AI_PRICE) {
        throw new Error(`Amount paid (₦${amountPaid}) is less than required (₦${USER_AI_PRICE})`);
    }
    const settings = readSettings(school);
    settings.ai_self_paid = settings.ai_self_paid || {};
    settings.ai_self_paid[userId] = {
        term: school.current_term,
        session: school.academic_session,
        reference,
        amount: amountPaid,
        ts: new Date().toISOString(),
    };
    await prisma.school.update({ where: { id: schoolId }, data: { settings } });
    return { ok: true, term: school.current_term, session: school.academic_session, amount: amountPaid };
}

interface PaystackVerifyResponse {
    status: boolean;
    data?: {
        status: string;
        amount: number; // kobo
        reference: string;
        customer: { customer_code: string; email: string };
        authorization: { authorization_code: string; channel: string };
    };
    message?: string;
}

/**
 * Verify a Paystack transaction reference. Throws on verification failure.
 */
export async function verifyPaystackTransaction(reference: string): Promise<PaystackVerifyResponse['data']> {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) throw new Error('PAYSTACK_SECRET_KEY is not configured');

    const resp = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
        headers: { Authorization: `Bearer ${secret}` },
    });
    const json = (await resp.json()) as PaystackVerifyResponse;
    if (!json.status || !json.data || json.data.status !== 'success') {
        throw new Error(json.message || 'Paystack transaction verification failed');
    }
    return json.data;
}

interface ActivateInput {
    school_id: string;
    plan_type: PlanType;
    student_count: number;
    reference: string;
}

/**
 * Activate a subscription after a successful Paystack payment.
 *  1. Verify with Paystack.
 *  2. Resolve the current Nigerian term (or next upcoming if in vacation).
 *  3. Snapshot the billing data on the school row.
 */
export async function activateSubscription(input: ActivateInput) {
    const { school_id, plan_type, student_count, reference } = input;

    if (!['free', 'basic', 'advanced'].includes(plan_type)) {
        throw new Error(`Invalid plan_type: ${plan_type}`);
    }
    if (!school_id) throw new Error('school_id is required');

    // Current plan + this term's self-paid AI users (server-trusted) so a Basic→Advanced
    // upgrade is charged only the difference, minus users who already bought their own AI.
    const existing = await prisma.school.findUnique({ where: { id: school_id } });
    const currentPlan = (existing?.plan_type as PlanType) || 'free';
    const aiSelfPaidUsers = countSelfPaidAiForTerm(existing);

    // Free plan: no Paystack verification needed.
    let authCode: string | null = null;
    let customerCode: string | null = null;
    let amountPaid = 0;

    if (plan_type !== 'free') {
        if (!reference) throw new Error('reference is required for paid plans');
        const tx = await verifyPaystackTransaction(reference);
        authCode = tx!.authorization?.authorization_code || null;
        customerCode = tx!.customer?.customer_code || null;
        amountPaid = Math.floor((tx!.amount || 0) / 100); // kobo → naira

        const expected = calcChargeAmount(currentPlan, plan_type, student_count, aiSelfPaidUsers);
        if (amountPaid < expected) {
            throw new Error(`Amount paid (₦${amountPaid}) is less than required (₦${expected})`);
        }
    }

    const termInfo = await getCurrentTerm(new Date());
    if (!termInfo && plan_type !== 'free') {
        throw new Error('No active academic term configured. Contact support.');
    }

    const termAmount = calcTermAmount(plan_type, student_count);

    const updated = await prisma.school.update({
        where: { id: school_id },
        data: {
            plan_type,
            subscription_status: plan_type === 'free' ? 'free' : 'active',
            student_count,
            term_amount: termAmount,
            current_term: termInfo?.term ?? null,
            academic_session: termInfo?.session ?? null,
            term_resumption_date: termInfo?.resumption_date ?? null,
            term_closing_date: termInfo?.closing_date ?? null,
            paystack_auth_code: authCode,
            paystack_customer_code: customerCode,
            trial_used: true,
        },
    });

    // Fire-and-forget receipt email with invoice PDF attached. We do NOT await
    // so a transient email failure can't roll back the activation.
    if (plan_type !== 'free' && termInfo && updated.contact_email) {
        try {
            const pdf = generateInvoicePdf({
                school: { name: updated.name, address: updated.address, contact_email: updated.contact_email },
                plan: plan_type,
                student_count,
                rate: PLAN_RATES[plan_type],
                total: termAmount,
                reference,
                term: {
                    term: termInfo.term,
                    session: termInfo.session,
                    resumption_date: termInfo.resumption_date,
                    closing_date: termInfo.closing_date,
                }
            });
            void SubscriptionEmailService.sendPaymentSuccess(
                { name: updated.name, admin_email: updated.contact_email },
                {
                    term: termInfo.term,
                    session: termInfo.session,
                    resumption_date: termInfo.resumption_date,
                    closing_date: termInfo.closing_date,
                },
                termAmount,
                pdf
            ).catch(e => console.warn('[Subscription] payment-success email failed:', e.message));
        } catch (e: any) {
            console.warn('[Subscription] invoice/email skipped:', e.message);
        }
    }

    return {
        school: {
            id: updated.id,
            plan_type: updated.plan_type,
            subscription_status: updated.subscription_status,
            student_count: updated.student_count,
            term_amount: updated.term_amount,
            current_term: updated.current_term,
            academic_session: updated.academic_session,
            term_resumption_date: updated.term_resumption_date,
            term_closing_date: updated.term_closing_date,
        },
        amount_paid: amountPaid,
    };
}

interface TopUpInput {
    school_id: string;
    new_student_count: number;
}

/**
 * Mid-term student top-up. Charges the school's saved Paystack authorization
 * for the additional headcount at the full per-child rate (no proration).
 */
export async function topUpStudents(input: TopUpInput) {
    const { school_id, new_student_count } = input;

    const school = await prisma.school.findUnique({ where: { id: school_id } });
    if (!school) throw new Error('School not found');
    if (school.subscription_status !== 'active') {
        throw new Error('Subscription is not active — renew before topping up students.');
    }
    if (!school.paystack_auth_code) {
        throw new Error('No saved payment method. Please re-activate your subscription.');
    }
    if (!school.contact_email) {
        throw new Error('School has no contact email for billing.');
    }

    const oldCount = school.student_count || 0;
    const extra = new_student_count - oldCount;
    if (extra <= 0) {
        // Allow lowering count without charge.
        const updated = await prisma.school.update({
            where: { id: school_id },
            data: { student_count: new_student_count }
        });
        return { charged: 0, extra: 0, school: updated };
    }

    const plan = (school.plan_type as PlanType) || 'basic';
    if (plan === 'free') throw new Error('Top-up not available on Free plan.');
    const rate = PLAN_RATES[plan];
    const topUpAmount = extra * rate;

    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) throw new Error('PAYSTACK_SECRET_KEY is not configured');

    const resp = await fetch(`${PAYSTACK_BASE}/transaction/charge_authorization`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${secret}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            authorization_code: school.paystack_auth_code,
            email: school.contact_email,
            amount: topUpAmount * 100, // kobo
        })
    });
    const json: any = await resp.json();
    if (!json.status || json.data?.status !== 'success') {
        void SubscriptionEmailService.sendPaymentFailed(
            { name: school.name, admin_email: school.contact_email },
            json.message || 'Charge declined'
        ).catch(() => { });
        throw new Error(json.message || 'Top-up charge failed');
    }

    const updated = await prisma.school.update({
        where: { id: school_id },
        data: {
            student_count: new_student_count,
            term_amount: (school.term_amount || 0) + topUpAmount,
        }
    });

    if (school.current_term && school.academic_session && school.term_resumption_date && school.term_closing_date) {
        void SubscriptionEmailService.sendTopUpCharged(
            { name: school.name, admin_email: school.contact_email },
            topUpAmount,
            extra,
            new_student_count,
            {
                term: school.current_term,
                session: school.academic_session,
                resumption_date: school.term_resumption_date,
                closing_date: school.term_closing_date,
            }
        ).catch(e => console.warn('[Subscription] top-up email failed:', e.message));
    }

    return { charged: topUpAmount, extra, school: updated };
}
