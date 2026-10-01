import prisma from '../config/database';
import { runAsPlatform } from '../lib/tenantContext';
import { NotificationDeliveryService } from './notificationDelivery.service';

/**
 * The parent watchdog: a daily pass that looks at each parent's OWN children and
 * tells them the things they would otherwise only find by opening the app.
 *
 * It raises four kinds of alert:
 *   - a fee that is overdue, or falls due within the next week
 *   - attendance that has dropped below 75% over the last 30 days
 *   - a report card that has just been published
 *   - an assignment due tomorrow that has not been handed in
 *
 * Isolation: children are resolved from the ParentChild rows of that parent
 * only, and each alert is addressed to that parent's own user id. A parent can
 * never be told anything about another family's child.
 *
 * Delivery goes through NotificationDeliveryService, so every alert obeys the
 * preferences on the notification settings screen — category off means silence,
 * digest means it waits for the digest, and "Email Alerts" off keeps it in-app.
 *
 * Repeat suppression: the same parent is not told the same thing twice within
 * the window below. That check is a lookup on the notifications already stored,
 * so it needs no extra table and survives a restart.
 */

/** Do not repeat an identical alert to the same parent within this many days. */
const REPEAT_AFTER_DAYS = 3;

/** Safety rail so one pass can never fan out without bound. */
const MAX_PARENTS_PER_RUN = 5000;

interface Alert {
    userId: string;
    schoolId: string;
    branchId?: string;
    category: 'fees' | 'attendance' | 'homework' | 'general';
    title: string;
    message: string;
}

function daysFromNow(n: number): Date {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d;
}

function daysAgo(n: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
}

export class ParentWatchdogService {
    /**
     * Run one pass. Returns what it looked at and what it sent, so the caller
     * (cron, or an admin triggering it by hand) can log something meaningful.
     */
    static async run(opts: { dryRun?: boolean; limit?: number; sample?: Alert[] } = {}): Promise<{ parents: number; alerts: number; sent: number }> {
        const parents = await runAsPlatform(() => prisma.parent.findMany({
            where: { deleted_at: null, user: { deleted_at: null, is_active: true } },
            select: { id: true, user_id: true, school_id: true, branch_id: true },
            take: Math.min(opts.limit ?? MAX_PARENTS_PER_RUN, MAX_PARENTS_PER_RUN),
        }));

        let alerts = 0, sent = 0;

        for (const parent of parents) {
            try {
                const found = await this.alertsForParent(parent);
                alerts += found.length;
                for (const alert of found) {
                    if (await this.alreadyTold(alert)) continue;
                    // dryRun reports what WOULD go out without notifying anyone —
                    // used to verify the rules against real data safely.
                    if (opts.dryRun) { opts.sample?.push(alert); sent++; continue; }

                    // Cron runs without an ambient tenant scope. Delivery reads
                    // NotificationSetting and writes Notification/queue records,
                    // so it must execute in the explicit platform scope just like
                    // the watchdog's discovery queries. Without this wrapper RLS
                    // sees an empty tenant and silently drops the delivery.
                    const result = await runAsPlatform(() => NotificationDeliveryService.deliver({
                        schoolId: alert.schoolId,
                        branchId: alert.branchId,
                        userId: alert.userId,
                        category: alert.category,
                        title: alert.title,
                        message: alert.message,
                    }));
                    if (result.delivered.length || result.queuedForDigest) sent++;
                }
            } catch (e: any) {
                // One parent's data problem must not stop the rest of the pass.
                console.warn('[ParentWatchdog] failed for parent', parent.id, e?.message);
            }
        }

        return { parents: parents.length, alerts, sent };
    }

    /** Every alert owed to ONE parent, about that parent's own children only. */
    private static async alertsForParent(parent: {
        id: string; user_id: string; school_id: string; branch_id: string | null;
    }): Promise<Alert[]> {
        const links = await runAsPlatform(() => prisma.parentChild.findMany({
            where: { parent_id: parent.id, deleted_at: null },
            select: { student_id: true, student: { select: { full_name: true } } },
        }));
        if (!links.length) return [];

        const ids = links.map(l => l.student_id);
        const nameOf = new Map(links.map(l => [l.student_id, l.student?.full_name || 'your child']));
        const base = {
            userId: parent.user_id,
            schoolId: parent.school_id,
            branchId: parent.branch_id ?? undefined,
        };

        const [fees, attendance, reportCards, enrolments] = await Promise.all([
            runAsPlatform(() => prisma.studentFee.findMany({
                where: {
                    student_id: { in: ids }, deleted_at: null,
                    status: { not: 'Paid' },
                    due_date: { lte: daysFromNow(7) },
                },
                select: { student_id: true, title: true, amount: true, paid_amount: true, due_date: true },
            })),
            runAsPlatform(() => prisma.attendance.findMany({
                where: { student_id: { in: ids }, date: { gte: daysAgo(30) } },
                select: { student_id: true, status: true },
            })),
            runAsPlatform(() => prisma.reportCard.findMany({
                where: {
                    student_id: { in: ids }, deleted_at: null, is_published: true,
                    updated_at: { gte: daysAgo(1) },
                },
                select: { student_id: true, term: true, session: true },
            })),
            runAsPlatform(() => prisma.studentEnrollment.findMany({
                where: { student_id: { in: ids } },
                select: { student_id: true, class_id: true, status: true },
            })),
        ]);

        const out: Alert[] = [];

        // 1. Money due — ONE message per child, not one per fee line. A parent
        // with several outstanding items would otherwise receive a separate
        // notification for each, which is how a helpful alert becomes spam.
        for (const id of ids) {
            const mine = fees
                .filter(f => f.student_id === id && (f.amount - (f.paid_amount || 0)) > 0)
                .sort((a, b) => a.due_date.getTime() - b.due_date.getTime());
            if (!mine.length) continue;

            const total = mine.reduce((sum, f) => sum + (f.amount - (f.paid_amount || 0)), 0);
            const anyOverdue = mine.some(f => f.due_date.getTime() < Date.now());
            const soonest = mine[0].due_date.toDateString();
            const detail = mine.length === 1
                ? `${mine[0].title} (${total}), due ${soonest}`
                : `${mine.length} items totalling ${total}, earliest due ${soonest}`;

            out.push({
                ...base,
                category: 'fees',
                title: anyOverdue ? 'A school fee is overdue' : 'A school fee is due soon',
                message: `${nameOf.get(id)}: ${detail}.`,
            });
        }

        // 2. Attendance slipping
        for (const id of ids) {
            const mine = attendance.filter(a => a.student_id === id);
            if (mine.length < 5) continue;   // too little data to judge
            const present = mine.filter(a => a.status === 'Present').length;
            const pct = Math.round((present / mine.length) * 100);
            if (pct >= 75) continue;
            out.push({
                ...base,
                category: 'attendance',
                title: 'Attendance needs attention',
                message: `${nameOf.get(id)} has been present for ${pct}% of the last ${mine.length} school days.`,
            });
        }

        // 3. A report card has just been released
        for (const rc of reportCards) {
            out.push({
                ...base,
                category: 'general',
                title: 'Report card released',
                message: `${nameOf.get(rc.student_id)}'s report card for ${rc.term}, ${rc.session} is now available.`,
            });
        }

        // 4. Homework due tomorrow and not handed in
        const classOf = new Map<string, string>();
        for (const e of enrolments) {
            if (!classOf.has(e.student_id) || e.status === 'Active') classOf.set(e.student_id, e.class_id);
        }
        for (const id of ids) {
            const classId = classOf.get(id);
            if (!classId) continue;
            const submitted = await runAsPlatform(() => prisma.assignmentSubmission.findMany({
                where: { student_id: id }, select: { assignment_id: true },
            }));
            const dueTomorrow = await runAsPlatform(() => prisma.assignment.findMany({
                where: {
                    class_id: classId, is_published: true,
                    due_date: { gte: new Date(), lte: daysFromNow(1) },
                    id: { notIn: submitted.map(s => s.assignment_id) },
                },
                select: { title: true, subject: true },
                take: 10,
            }));
            if (!dueTomorrow.length) continue;
            // Again one message per child, listing the pieces.
            const titles = dueTomorrow.map(a => `${a.title} (${a.subject})`).join(', ');
            out.push({
                ...base,
                category: 'homework',
                title: 'Homework due tomorrow',
                message: dueTomorrow.length === 1
                    ? `${nameOf.get(id)} has not yet handed in ${titles}, due tomorrow.`
                    : `${nameOf.get(id)} has ${dueTomorrow.length} assignments due tomorrow, not yet handed in: ${titles}.`,
            });
        }

        return out;
    }

    /**
     * Has this parent already been told this exact thing recently?
     *
     * Without this the pass would repeat every alert every day for as long as the
     * condition held — an unpaid fee would nag daily until it was paid.
     */
    private static async alreadyTold(alert: Alert): Promise<boolean> {
        const existing = await runAsPlatform(() => prisma.notification.findFirst({
            where: {
                user_id: alert.userId,
                title: alert.title,
                message: alert.message,
                created_at: { gte: daysAgo(REPEAT_AFTER_DAYS) },
            },
            select: { id: true },
        }));
        return !!existing;
    }
}
