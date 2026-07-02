import prisma from '../config/database';
import { SocketService } from './socket.service';

export class HealthService {
    static async getHealthLogs(schoolId: string, branchId: string | undefined) {
        const where: any = { school_id: schoolId };

        if (branchId && branchId !== 'all') {
            where.branch_id = branchId;
        }

        return prisma.healthLog.findMany({
            where,
            include: { 
                student: { 
                    select: { 
                        full_name: true,
                        avatar_url: true
                    } 
                } 
            },
            orderBy: { logged_date: 'desc' },
            take: 50
        });
    }

    static async createHealthLog(schoolId: string, branchId: string | undefined, data: any) {
        // Explicitly pick only known HealthLog model fields to avoid Prisma unknown-argument errors.
        const {
            student_id, log_type, temperature, symptoms, condition,
            medication_administered, notes, description, parent_notified,
            logged_by, follow_up, logged_date,
        } = data;

        const log = await prisma.healthLog.create({
            data: {
                school_id: schoolId,
                branch_id: branchId || null,
                log_type: log_type || 'general',
                notes: notes || description || null,
                logged_date: logged_date ? new Date(logged_date) : new Date(),
                parent_notified: parent_notified === true,
                ...(temperature !== undefined ? { temperature } : {}),
                ...(symptoms !== undefined ? { symptoms } : {}),
                ...(condition !== undefined ? { condition } : {}),
                ...(medication_administered !== undefined ? { medication_administered } : {}),
                ...(logged_by !== undefined ? { logged_by } : {}),
                ...(follow_up !== undefined ? { follow_up } : {}),
                ...(student_id ? { student: { connect: { id: student_id } } } : {}),
            }
        });

        SocketService.emitToSchool(schoolId, 'health:updated', { action: 'create', logId: log.id });
        return log;
    }
}
