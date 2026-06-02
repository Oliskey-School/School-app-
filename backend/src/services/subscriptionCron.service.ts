import prisma from '../config/database';
import { SubscriptionEmailService } from './subscriptionEmail.service';
import { getCurrentTerm } from './term.service';

/**
 * Daily subscription cron.
 *
 *   - Production-only: never runs in dev/test by default. Set
 *     RUN_SUBSCRIPTION_CRON=true to force.
 *   - Schedule: 00:00 Africa/Lagos (= 23:00 UTC the previous day).
 *
 * Steps every run:
 *   1. Expire schools whose term_closing_date has passed → status='expired',
 *      plan_type='free'. Send "term ended" email.
 *   2. Send "7 days left" reminders.
 *   3. Send "3 days left" reminders.
 *
 * Idempotent: re-running the same day re-evaluates state without double-charging.
 * Email sends are best-effort — failures logged but don't stop other rows.
 */

const ONE_DAY_MS = 1000 * 60 * 60 * 24;

function makeWindow(daysFromNow: number) {
    const now = new Date();
    const start = new Date(now.getTime() + (daysFromNow - 0.5) * ONE_DAY_MS);
    const end = new Date(now.getTime() + (daysFromNow + 0.5) * ONE_DAY_MS);
    return { start, end };
}

export async function runSubscriptionCron() {
    const today = new Date();
    console.log(`🕛 [SubscriptionCron] Run at ${today.toISOString()}`);

    // 1. Expire schools whose term ended
    const expired = await prisma.school.findMany({
        where: {
            subscription_status: 'active',
            term_closing_date: { lt: today },
        },
        select: {
            id: true, name: true, contact_email: true,
            current_term: true, academic_session: true,
            term_resumption_date: true, term_closing_date: true,
        },
    });

    if (expired.length) console.log(`📪 [SubscriptionCron] Expiring ${expired.length} school(s)`);
    const nextTerm = await getCurrentTerm(new Date(today.getTime() + ONE_DAY_MS));
    for (const s of expired) {
        await prisma.school.update({
            where: { id: s.id },
            data: { subscription_status: 'expired', plan_type: 'free' },
        });
        if (s.contact_email && s.current_term && s.academic_session && s.term_resumption_date && s.term_closing_date) {
            await SubscriptionEmailService.sendTermEnded(
                { name: s.name, admin_email: s.contact_email },
                {
                    term: s.current_term,
                    session: s.academic_session,
                    resumption_date: s.term_resumption_date,
                    closing_date: s.term_closing_date,
                },
                nextTerm && !nextTerm.is_vacation === false ? {
                    term: nextTerm.term,
                    session: nextTerm.session,
                    resumption_date: nextTerm.resumption_date,
                    closing_date: nextTerm.closing_date,
                } : undefined
            ).catch(e => console.warn(`[SubscriptionCron] term-ended email failed for ${s.id}:`, e.message));
        }
    }

    // 2. 7-day reminder
    const w7 = makeWindow(7);
    const sevenDay = await prisma.school.findMany({
        where: {
            subscription_status: 'active',
            term_closing_date: { gte: w7.start, lte: w7.end },
        },
        select: {
            id: true, name: true, contact_email: true,
            current_term: true, academic_session: true,
            term_resumption_date: true, term_closing_date: true,
        },
    });
    if (sevenDay.length) console.log(`📨 [SubscriptionCron] 7-day reminder × ${sevenDay.length}`);
    for (const s of sevenDay) {
        if (s.contact_email && s.current_term && s.academic_session && s.term_resumption_date && s.term_closing_date) {
            await SubscriptionEmailService.send7DayReminder(
                { name: s.name, admin_email: s.contact_email },
                {
                    term: s.current_term,
                    session: s.academic_session,
                    resumption_date: s.term_resumption_date,
                    closing_date: s.term_closing_date,
                },
                nextTerm ? {
                    term: nextTerm.term,
                    session: nextTerm.session,
                    resumption_date: nextTerm.resumption_date,
                    closing_date: nextTerm.closing_date,
                } : undefined
            ).catch(e => console.warn(`[SubscriptionCron] 7-day email failed for ${s.id}:`, e.message));
        }
    }

    // 3. 3-day reminder
    const w3 = makeWindow(3);
    const threeDay = await prisma.school.findMany({
        where: {
            subscription_status: 'active',
            term_closing_date: { gte: w3.start, lte: w3.end },
        },
        select: {
            id: true, name: true, contact_email: true,
            current_term: true, academic_session: true,
            term_resumption_date: true, term_closing_date: true,
        },
    });
    if (threeDay.length) console.log(`📨 [SubscriptionCron] 3-day reminder × ${threeDay.length}`);
    for (const s of threeDay) {
        if (s.contact_email && s.current_term && s.academic_session && s.term_resumption_date && s.term_closing_date) {
            await SubscriptionEmailService.send3DayReminder(
                { name: s.name, admin_email: s.contact_email },
                {
                    term: s.current_term,
                    session: s.academic_session,
                    resumption_date: s.term_resumption_date,
                    closing_date: s.term_closing_date,
                }
            ).catch(e => console.warn(`[SubscriptionCron] 3-day email failed for ${s.id}:`, e.message));
        }
    }

    console.log('✅ [SubscriptionCron] Done.');
}

/**
 * Wire the cron schedule at boot. No-op outside production unless
 * RUN_SUBSCRIPTION_CRON=true is set in env.
 */
export function startSubscriptionCron() {
    const isProd = process.env.NODE_ENV === 'production';
    const force = process.env.RUN_SUBSCRIPTION_CRON === 'true';
    if (!isProd && !force) {
        console.log('🚫 [SubscriptionCron] Skipped (not production). Set RUN_SUBSCRIPTION_CRON=true to enable.');
        return;
    }

    let cron: any;
    try {
        cron = require('node-cron');
    } catch {
        console.warn('⚠️ [SubscriptionCron] node-cron not installed — run `npm install node-cron @types/node-cron` to enable.');
        return;
    }

    // 00:00 Africa/Lagos. node-cron supports timezone option natively.
    cron.schedule('0 0 * * *', () => {
        runSubscriptionCron().catch(e => console.error('[SubscriptionCron] crashed:', e));
    }, { timezone: 'Africa/Lagos' });

    console.log('🕛 [SubscriptionCron] Scheduled daily at 00:00 Africa/Lagos');
}
