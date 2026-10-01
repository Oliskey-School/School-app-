import prisma from '../config/database';
import { sanitisePreferences, defaultPreferences } from './notificationPreferences';
import { SocketService } from './socket.service';

export class NotificationService {
    static async createNotification(schoolId: string, branchId: string | undefined, notificationData: any) {
        console.log('🔔 [NotificationService] createNotification received:', JSON.stringify(notificationData));
        const { 
            school_id, 
            branch_id, 
            user_id, 
            recipient_id, 
            recipient_type, 
            audience,
            title,
            message,
            summary, // Added fallback
            category,
            is_read,
            metadata // Extract to avoid passing to Prisma if not in schema
        } = notificationData;

        // Map recipient_id to user_id if provided
        const targetUserId = user_id || recipient_id;
        
        // Map recipient_type to audience if provided
        let targetAudience = Array.isArray(audience) ? audience : [];
        if (recipient_type && !targetAudience.includes(recipient_type)) {
            targetAudience.push(recipient_type);
        }

        const dataToCreate = {
            title,
            message: message || summary || 'No details provided.', // Fallback logic
            category: category || 'System',
            user_id: targetUserId,
            audience: targetAudience,
            is_read: is_read || false,
            school_id: schoolId,
            branch_id: branchId && branchId !== 'all' ? branchId : null
        };
        
        console.log('🔔 [NotificationService] Prisma data payload:', JSON.stringify(dataToCreate));

        const notification = await prisma.notification.create({
            data: dataToCreate
        });

        // Emit to specific user if targeted. Room-scoped (not the global
        // broadcast) — every connected client across every school used to
        // receive this event object on every notification created anywhere
        // on the platform; only the matching event-name listener (per user id)
        // acted on it, but the transport itself broadcast to everyone.
        if (targetUserId) {
            SocketService.emitToUser(targetUserId, `user:${targetUserId}:notification`, notification);
        } else {
            // Emit to school if it's a broadcast
            SocketService.emitToSchool(schoolId, 'notification:received', notification);
        }

        return notification;
    }

    /**
     * The bell list: the newest `limit` notifications for this user.
     *
     * This used to have no `take` at all, so it returned every notification the
     * user had ever received — on the demo parent that was ~350 rows / 115KB and
     * the slowest request in the app. Nothing consuming this needs the full
     * history: the alerts screen renders a list, the dashboard looks for the
     * latest unread reminder, and the promotion banner looks for a recent
     * notification. No unread *count* is derived from it, so capping is safe.
     * Soft-deleted rows were being returned too.
     */
    static async getNotificationsForUser(schoolId: string, branchId: string | undefined, userId: string, audience: string[], limit = 50) {
        const rows = await prisma.notification.findMany({
            where: {
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : undefined,
                deleted_at: null,
                OR: [
                    { user_id: userId },
                    { audience: { hasSome: audience } },
                    { audience: { has: 'all' } }
                ]
            },
            orderBy: { created_at: 'desc' },
            take: limit
        });
        // A personal notification carries its own flag; a shared (audience) one is
        // "read" for THIS user only when this user has a read mark for it.
        const sharedIds = rows.filter(r => r.user_id !== userId).map(r => r.id);
        const reads = sharedIds.length
            ? await prisma.notificationRead.findMany({ where: { school_id: schoolId, user_id: userId, notification_id: { in: sharedIds } }, select: { notification_id: true } })
            : [];
        const readSet = new Set(reads.map(r => r.notification_id));
        return rows.map(r => (r.user_id === userId ? r : { ...r, is_read: readSet.has(r.id) }));
    }

    /**
     * Mark notifications read for ONE user. Personal rows flip their own flag;
     * shared rows get a per-user read mark (never touching other readers).
     * Returns how many of the requested ids were marked.
     */
    static async markReadForUser(schoolId: string, userId: string, ids: string[]): Promise<number> {
        const clean = Array.from(new Set(ids.map(String).filter(Boolean)));
        if (clean.length === 0) return 0;
        const rows = await prisma.notification.findMany({ where: { id: { in: clean }, school_id: schoolId }, select: { id: true, user_id: true } });
        const own = rows.filter(r => r.user_id === userId).map(r => r.id);
        const shared = rows.filter(r => r.user_id !== userId).map(r => r.id);
        if (own.length) await prisma.notification.updateMany({ where: { id: { in: own } }, data: { is_read: true } });
        for (const id of shared) {
            await prisma.notificationRead.upsert({
                where: { notification_id_user_id: { notification_id: id, user_id: userId } },
                update: { read_at: new Date() },
                create: { school_id: schoolId, notification_id: id, user_id: userId },
            });
        }
        return own.length + shared.length;
    }

    static async markAsRead(schoolId: string, branchId: string | undefined, notificationId: string, userId?: string) {
        const existing = await prisma.notification.findFirst({
            where: { id: notificationId, school_id: schoolId, ...(branchId && branchId !== 'all' ? { branch_id: branchId } : {}) },
        });
        if (!existing) throw new Error('Notification not found in your school/branch');
        if (userId) {
            await this.markReadForUser(schoolId, userId, [notificationId]);
        } else {
            await prisma.notification.update({ where: { id: notificationId }, data: { is_read: true } });
        }
        const result = await prisma.notification.findUniqueOrThrow({ where: { id: notificationId } });

        SocketService.emitToSchool(schoolId, 'notification:updated', { action: 'mark_read', notificationId });
        return { ...result, is_read: true };
    }

    // Platform Notifications (Global/SaaS)
    static async createPlatformNotification(data: any) {
        return await prisma.platformNotification.create({
            data: {
                title: data.title,
                message: data.message,
                type: data.type,
                priority: data.priority,
                target_schools: data.targetSchools || [],
                created_by: data.createdBy,
                sent_at: data.sentAt ? new Date(data.sentAt) : new Date(),
                expires_at: data.expiresAt ? new Date(data.expiresAt) : null
            }
        });
    }

    static async getAllPlatformNotifications() {
        return await prisma.platformNotification.findMany({
            orderBy: { created_at: 'desc' },
            include: {
                author: {
                    select: {
                        full_name: true,
                        email: true
                    }
                }
            }
        });
    }

    static async getPlatformNotificationsForSchool(schoolId: string) {
        return await prisma.platformNotification.findMany({
            where: {
                OR: [
                    { target_schools: { has: schoolId } },
                    { target_schools: { isEmpty: true } }
                ],
                AND: [
                    {
                        OR: [
                            { expires_at: null },
                            { expires_at: { gt: new Date() } }
                        ]
                    },
                    { sent_at: { lte: new Date() } }
                ]
            },
            orderBy: { sent_at: 'desc' }
        });
    }

    // Notification Settings
    /**
     * The user's notification preferences, always in the canonical shape
     * { digest_time, categories: [{ id, mode, channel }] }.
     *
     * Rows written before this shape existed hold a flat boolean blob; they are
     * normalised on read by sanitisePreferences rather than migrated, because
     * the old blob carried no per-category mode or channel to migrate.
     */
    static async getSettingsByUserId(userId: string) {
        let settings = await prisma.notificationSetting.findUnique({
            where: { user_id: userId }
        });

        if (!settings) {
            const defaults = defaultPreferences();

            // Demo / virtual sessions: the user may not be a real DB row, and
            // NotificationSetting.user_id has a hard FK to users.id, so create()
            // would throw (500) instead of just having no saved settings yet.
            // Same guard as updateSettingsByUserId below — return the defaults
            // without persisting rather than let the FK violation surface.
            const owner = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, school_id: true } });
            if (!owner) {
                return defaults;
            }

            settings = await prisma.notificationSetting.create({
                data: {
                    user_id: userId,
                    categories: defaults.categories as any,
                    digest_time: defaults.digest_time,
                    email_alerts: defaults.email_alerts,
                    weekly_summary: defaults.weekly_summary,
                    // The caller's own school. (Defaults used to be written under a
                    // fake 'GLOBAL' tenant, which only ever worked with a superuser
                    // connection — RLS correctly refuses that row.)
                    school_id: owner.school_id,
                    branch_id: null
                }
            });
        }

        // `categories` holds the category ARRAY and nothing else; the two
        // switches live in their own columns (migration 20261001100000).
        return sanitisePreferences({
            digest_time: settings.digest_time,
            categories: settings.categories,
            email_alerts: settings.email_alerts,
            weekly_summary: settings.weekly_summary,
        });
    }

    static async updateSettingsByUserId(userId: string, data: any, schoolId?: string, branchId?: string | null) {
        // Demo / virtual sessions: the user may not be a real DB row, so the FK on
        // NotificationSetting would fail. Persisting isn't meaningful (demo resets
        // daily) — return the preferences as a successful no-op.
        const owner = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, school_id: true } });
        if (!owner) {
            return sanitisePreferences(data);
        }

        // school_id is REQUIRED on NotificationSetting — was missing, causing the
        // "Failed to save preferences" 500. Resolve it (from the request, else the user).
        const sid = schoolId || owner.school_id;

        // Validate against the known preference shape.
        //
        // This used to keep only values where `typeof value === "boolean"`, which
        // was meant to stop a caller's stray keys (school_id, other ids…) landing
        // in the JSON column. It did stop that — but the settings screen sends an
        // ARRAY of { id, mode, channel } plus a digest_time string, none of which
        // are booleans, so every real preference was dropped and an empty object
        // was written. Whitelisting the actual shape keeps the original guarantee
        // (nothing unknown reaches the column) while persisting what the user
        // chose. Emergency alerts are forced back to 'instant' here too, since a
        // client can send anything.
        const prefs = sanitisePreferences(data);
        const categories = prefs.categories;

        await prisma.notificationSetting.upsert({
            where: { user_id: userId },
            update: {
                categories: categories as any,
                digest_time: prefs.digest_time,
                email_alerts: prefs.email_alerts,
                weekly_summary: prefs.weekly_summary,
                school_id: sid,
                ...(branchId !== undefined ? { branch_id: branchId } : {}),
                updated_at: new Date()
            },
            create: {
                user_id: userId,
                categories: categories as any,
                school_id: sid,
                branch_id: branchId ?? null,
                digest_time: prefs.digest_time,
                email_alerts: prefs.email_alerts,
                weekly_summary: prefs.weekly_summary
            }
        });

        // Return what was actually stored, so the screen reflects the server's
        // decision (e.g. emergency forced back to instant) rather than its own
        // optimistic state.
        return prefs;
    }
}
