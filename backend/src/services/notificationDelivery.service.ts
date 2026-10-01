import prisma from '../config/database';
import { runAsPlatform } from '../lib/tenantContext';
import { EmailService } from './email.service';
import { NotificationService } from './notification.service';
import {
    CATEGORY_IDS, CategoryId, Channel, channelAvailability,
    preferenceFor, sanitisePreferences, defaultPreferences,
} from './notificationPreferences';

/**
 * Turns a notification into actual delivery, honouring the recipient's
 * preferences from the Notification Digest screen.
 *
 * Before this existed, those preferences were decoration: even once they saved
 * correctly, nothing read them. createNotification always wrote an in-app row
 * and emitted a socket event, whatever the user had chosen — "Off" still
 * notified, "Digest" still fired instantly, and picking Email sent no email.
 *
 * Delivery rules, per category:
 *   off      -> nothing is sent (except ALWAYS_INSTANT categories, which the
 *               preference layer refuses to turn off in the first place)
 *   instant  -> delivered now, on the chosen channel
 *   digest   -> queued; the daily digest job sends one summary at digest_time
 *
 * Channel support is deliberately honest. inapp and email are real. push, sms
 * and whatsapp have no server-side sender and no provider credentials anywhere
 * in this codebase, so rather than silently dropping the message we fall back
 * to in-app and say so in the returned result. Wiring a provider later means
 * implementing one function and flipping its flag in channelAvailability().
 */

export interface DeliveryInput {
    schoolId: string;
    branchId?: string;
    userId: string;
    category: CategoryId;
    title: string;
    message: string;
}

export interface DeliveryResult {
    delivered: Channel[];
    queuedForDigest: boolean;
    suppressed: boolean;
    fellBackToInApp: boolean;
    reason?: string;
}

/** A category the preference system knows, or 'general' as the catch-all. */
export function toCategoryId(raw: unknown): CategoryId {
    const v = String(raw || '').toLowerCase();
    return (CATEGORY_IDS as readonly string[]).includes(v) ? (v as CategoryId) : 'general';
}

async function loadPreferences(userId: string) {
    try {
        const row = await prisma.notificationSetting.findUnique({ where: { user_id: userId } });
        if (!row) return defaultPreferences();
        // The `categories` column holds the whole preference document; rows
        // written before email_alerts/weekly_summary existed still hold a bare
        // array. Accept both, or the per-category choices read back as defaults.
        const stored: any = row.categories;
        return sanitisePreferences({
            digest_time: row.digest_time,
            ...(Array.isArray(stored) ? { categories: stored } : (stored || {})),
        });
    } catch {
        // A preference lookup must never stop a notification going out.
        return defaultPreferences();
    }
}

export class NotificationDeliveryService {
    /**
     * Deliver one notification to one user according to their preferences.
     * Never throws: a delivery problem must not fail the action that triggered it
     * (marking attendance, recording a payment…).
     */
    static async deliver(input: DeliveryInput): Promise<DeliveryResult> {
        const result: DeliveryResult = {
            delivered: [], queuedForDigest: false, suppressed: false, fellBackToInApp: false,
        };

        const prefs = await loadPreferences(input.userId);
        const pref = preferenceFor(prefs, input.category);

        if (pref.mode === 'off') {
            result.suppressed = true;
            result.reason = `user turned "${input.category}" off`;
            return result;
        }

        if (pref.mode === 'digest') {
            await this.queueForDigest(input);
            result.queuedForDigest = true;
            return result;
        }

        // "Email Alerts" off is a master switch: anything routed to email is
        // delivered in-app instead, so the user still gets the notification and
        // simply stops receiving mail.
        const channel = !prefs.email_alerts && pref.channel === 'email' ? 'inapp' : pref.channel;
        return this.sendNow(input, channel, result);
    }

    /** Instant delivery on one channel, falling back to in-app when it cannot be used. */
    private static async sendNow(input: DeliveryInput, channel: Channel, result: DeliveryResult): Promise<DeliveryResult> {
        const available = channelAvailability();
        let effective = channel;

        if (!available[channel]) {
            effective = 'inapp';
            result.fellBackToInApp = true;
            result.reason = `${channel} is not configured on this deployment`;
        }

        // The in-app record is always written: it is the notification history the
        // bell icon reads, and the fallback when another channel is unavailable.
        await this.writeInApp(input);
        result.delivered.push('inapp');

        if (effective === 'email') {
            const sent = await this.sendEmail(input);
            if (sent) result.delivered.push('email');
            else {
                result.fellBackToInApp = true;
                result.reason = 'email could not be sent; delivered in-app only';
            }
        }

        return result;
    }

    private static async writeInApp(input: DeliveryInput) {
        try {
            await NotificationService.createNotification(input.schoolId, input.branchId, {
                user_id: input.userId,
                title: input.title,
                message: input.message,
                category: input.category,
            });
        } catch (e: any) {
            console.warn('[NotificationDelivery] in-app write failed:', e?.message);
        }
    }

    private static async sendEmail(input: DeliveryInput): Promise<boolean> {
        try {
            const user = await runAsPlatform(() => prisma.user.findUnique({
                where: { id: input.userId },
                select: { email: true, full_name: true },
            }));
            if (!user?.email) return false;
            await EmailService.sendNotificationEmail(user.email, user.full_name || 'there', input.title, input.message);
            return true;
        } catch (e: any) {
            console.warn('[NotificationDelivery] email failed:', e?.message);
            return false;
        }
    }

    /**
     * Hold a notification for the user's daily digest.
     *
     * Stored as an ordinary unread in-app row tagged `digest:<category>`, so it
     * still appears in the bell immediately (the user asked for a quieter
     * summary, not for the item to vanish) and the digest job can find exactly
     * what has not been summarised yet without a new table.
     */
    private static async queueForDigest(input: DeliveryInput) {
        try {
            await NotificationService.createNotification(input.schoolId, input.branchId, {
                user_id: input.userId,
                title: input.title,
                message: input.message,
                category: `digest:${input.category}`,
            });
        } catch (e: any) {
            console.warn('[NotificationDelivery] digest queue failed:', e?.message);
        }
    }

    /**
     * Send every user whose digest_time matches `hhmm` one email summarising the
     * items queued since their last digest. Called once a minute by the cron in
     * notificationDigestCron.service.ts.
     */
    static async runDigestForTime(hhmm: string): Promise<{ users: number; sent: number }> {
        const settings = await runAsPlatform(() => prisma.notificationSetting.findMany({
            where: { digest_time: hhmm },
            select: { user_id: true, school_id: true },
        }));

        let sent = 0;
        for (const s of settings) {
            try {
                const pending = await runAsPlatform(() => prisma.notification.findMany({
                    where: { user_id: s.user_id, is_read: false, category: { startsWith: 'digest:' } },
                    orderBy: { created_at: 'desc' },
                    take: 50,
                }));
                if (!pending.length) continue;

                const user = await runAsPlatform(() => prisma.user.findUnique({
                    where: { id: s.user_id },
                    select: { email: true, full_name: true },
                }));
                if (!user?.email) continue;

                const lines = pending.map(p => `• ${p.title} — ${p.message}`).join('\n');
                const ok = await this.sendEmail({
                    schoolId: s.school_id,
                    userId: s.user_id,
                    category: 'general',
                    title: `Your daily summary (${pending.length} update${pending.length === 1 ? '' : 's'})`,
                    message: lines,
                }).catch(() => false);
                if (ok) sent++;

                // Re-tag so the same items are not summarised again tomorrow.
                await runAsPlatform(() => prisma.notification.updateMany({
                    where: { id: { in: pending.map(p => p.id) } },
                    data: { category: 'General' },
                }));
            } catch (e: any) {
                console.warn('[NotificationDigest] failed for user', s.user_id, e?.message);
            }
        }
        return { users: settings.length, sent };
    }

    /**
     * The Monday roll-up behind the "Weekly Summary" switch.
     *
     * Runs at the same hh:mm the user picked for their daily digest, but only on
     * Mondays and only for users who turned it on. Unlike the daily digest it
     * does not consume anything: it reports on the last seven days and leaves
     * every row exactly as it was, so it can never swallow an unread item.
     */
    static async runWeeklySummaryForTime(hhmm: string): Promise<{ users: number; sent: number }> {
        const settings = await runAsPlatform(() => prisma.notificationSetting.findMany({
            where: { digest_time: hhmm },
            select: { user_id: true, school_id: true, categories: true },
        }));

        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        let users = 0, sent = 0;

        for (const s of settings) {
            try {
                if (!sanitisePreferences(s.categories).weekly_summary) continue;
                users++;

                const week = await runAsPlatform(() => prisma.notification.findMany({
                    where: { user_id: s.user_id, created_at: { gte: since }, deleted_at: null },
                    orderBy: { created_at: 'desc' },
                    take: 100,
                }));
                if (!week.length) continue;

                const user = await runAsPlatform(() => prisma.user.findUnique({
                    where: { id: s.user_id },
                    select: { email: true, full_name: true },
                }));
                if (!user?.email) continue;

                const lines = week.map(p => `• ${p.title} — ${p.message}`).join('\n');
                const ok = await this.sendEmail({
                    schoolId: s.school_id,
                    userId: s.user_id,
                    category: 'general',
                    title: `Your weekly summary (${week.length} update${week.length === 1 ? '' : 's'})`,
                    message: lines,
                }).catch(() => false);
                if (ok) sent++;
            } catch (e: any) {
                console.warn('[WeeklySummary] failed for user', s.user_id, e?.message);
            }
        }
        return { users, sent };
    }
}
