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
export function calcChargeAmount(currentPlan: PlanType, newPlan: PlanType, studentCount: number): number {
    const target = calcTermAmount(newPlan, studentCount);
    if (currentPlan === 'basic' && newPlan === 'advanced') {
        const credit = calcTermAmount('basic', studentCount);
        return Math.max(0, target - credit);
    }
    return target;
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

    // Current plan (server-trusted) so a Basic→Advanced upgrade is charged only the
    // difference, not the full Advanced price.
    const existing = await prisma.school.findUnique({ where: { id: school_id }, select: { plan_type: true } });
    const currentPlan = (existing?.plan_type as PlanType) || 'free';

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

        const expected = calcChargeAmount(currentPlan, plan_type, student_count);
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
