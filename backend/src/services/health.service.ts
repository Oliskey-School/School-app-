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
        // Destructure to sanitize incoming data
        const { school_id, branch_id, description, ...logData } = data;

        const log = await prisma.healthLog.create({
            data: {
                ...logData,
                notes: description, // Map frontend description to backend notes
                school_id: schoolId,
                branch_id: branchId || null,
                logged_date: logData.logged_date ? new Date(logData.logged_date) : new Date(),
                parent_notified: logData.parent_notified === true
            }
        });

        SocketService.emitToSchool(schoolId, 'health:updated', { action: 'create', logId: log.id });
        return log;
    }
}
