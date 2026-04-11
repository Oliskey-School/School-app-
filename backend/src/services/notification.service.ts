import prisma from '../config/database';
import { SocketService } from './socket.service';

export class NotificationService {
    static async createNotification(schoolId: string, branchId: string | undefined, notificationData: any) {
        // Destructure to prevent conflicts with explicitly provided IDs
        const { school_id, branch_id, ...data } = notificationData;

        const notification = await prisma.notification.create({
            data: {
                ...data,
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : null
            }
        });

        // Emit to specific user if targeted
        if (data.user_id) {
            SocketService.emit(`user:${data.user_id}:notification`, notification);
        } else {
            // Emit to school if it's a broadcast
            SocketService.emitToSchool(schoolId, 'notification:received', notification);
        }

        return notification;
    }

    static async getNotificationsForUser(schoolId: string, branchId: string | undefined, userId: string, audience: string[]) {
        return await prisma.notification.findMany({
            where: {
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : undefined,
                OR: [
                    { user_id: userId },
                    { audience: { hasSome: audience } },
                    { audience: { has: 'all' } }
                ]
            },
            orderBy: { created_at: 'desc' }
        });
    }

    static async markAsRead(schoolId: string, branchId: string | undefined, notificationId: string) {
        const result = await prisma.notification.update({
            where: { id: notificationId },
            data: { is_read: true }
        });

        SocketService.emitToSchool(schoolId, 'notification:updated', { action: 'mark_read', notificationId });
        return result;
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
}
