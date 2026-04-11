import prisma from '../config/database';
import { NotificationService } from './notification.service';
import { SocketService } from './socket.service';

const ALERT_TYPE_MAP: Record<string, string> = {
    emergency: 'lockdown',
    high: 'severe_weather',
};

const SEVERITY_MAP: Record<string, string> = {
    emergency: 'critical',
    high: 'warning',
};

export class EmergencyService {
    /**
     * Send an emergency broadcast, persist it to the DB, and fan-out notifications.
     */
    static async triggerEmergencyBroadcast(schoolId: string, payload: {
        title: string;
        message: string;
        urgency: 'high' | 'emergency';
        targetAudience: string[];
        sentBy?: string;
    }) {
        const { title, message, urgency = 'emergency', targetAudience = ['all'], sentBy } = payload;

        if (!title?.trim() || !message?.trim()) {
            throw new Error('Title and message are required');
        }

        // 1. Persist broadcast record
        const alert = await (prisma as any).emergencyAlert.create({
            data: {
                school_id: schoolId,
                title,
                message,
                alert_type: ALERT_TYPE_MAP[urgency] || 'general',
                severity: SEVERITY_MAP[urgency] || 'warning',
                target_audiences: targetAudience,
                sent_by: sentBy || null,
            }
        });

        // 2. Fan-out in-app notifications to target roles
        try {
            const rolesToNotify: string[] = targetAudience.includes('all')
                ? ['STUDENT', 'PARENT', 'TEACHER', 'ADMIN']
                : targetAudience.map(a => a.toUpperCase());

            // Fetch users matching the target roles within the school
            const usersToNotify = await prisma.user.findMany({
                where: {
                    school_id: schoolId,
                    role: { in: rolesToNotify as any },
                    is_active: true,
                },
                select: { id: true }
            });

            // Bulk-create notifications
            if (usersToNotify.length > 0) {
                await prisma.notification.createMany({
                    data: usersToNotify.map(u => ({
                        user_id: u.id,
                        school_id: schoolId,
                        title: `🚨 ${title}`,
                        message,
                        type: 'emergency',
                        is_read: false,
                    })),
                    skipDuplicates: true,
                });
            }
        } catch (notifErr: any) {
            // Non-fatal — alert is already saved
            console.error('[EmergencyService] Notification fan-out failed:', notifErr.message);
        }

        SocketService.emitToSchool(schoolId, 'emergency:updated', { alertId: alert.id, title, urgency });
        
        return {
            success: true,
            alertId: alert.id,
            message: `Emergency broadcast sent to ${targetAudience.join(', ')}`,
        };
    }

    /**
     * Fetch broadcast history for a school, ordered newest first.
     */
    static async getBroadcastHistory(schoolId: string, limit = 20) {
        return await (prisma as any).emergencyAlert.findMany({
            where: { school_id: schoolId },
            orderBy: { sent_at: 'desc' },
            take: limit,
        });
    }
}
