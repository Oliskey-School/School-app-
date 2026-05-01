import prisma from '../config/database';
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

        // Emit to specific user if targeted
        if (targetUserId) {
            SocketService.emit(`user:${targetUserId}:notification`, notification);
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

    // Notification Settings
    static async getSettingsByUserId(userId: string) {
        let settings = await prisma.notificationSetting.findUnique({
            where: { user_id: userId }
        });

        if (!settings) {
            // Initialize with defaults if not exists
            const defaultCategories = {
                emailAlerts: true,
                pushNotifications: true,
                weeklySummary: false,
                assignmentReminders: true,
                attendanceAlerts: true,
                paymentReminders: true
            };

            settings = await prisma.notificationSetting.create({
                data: {
                    user_id: userId,
                    categories: defaultCategories,
                    digest_time: '19:00'
                }
            });
        }

        return settings;
    }

    static async updateSettingsByUserId(userId: string, data: any) {
        return await prisma.notificationSetting.upsert({
            where: { user_id: userId },
            update: {
                categories: data,
                updated_at: new Date()
            },
            create: {
                user_id: userId,
                categories: data,
                digest_time: '19:00'
            }
        });
    }
}
