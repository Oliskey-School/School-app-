import prisma from '../config/database';
import { SocketService } from './socket.service';

export class AuditService {
    static async createLog(schoolId: string, branchId: string | undefined, data: any) {
        const log = await prisma.auditLog.create({
            data: {
                school_id: schoolId,
                branch_id: branchId || null,
                user_id: data.user_id || null,
                action: data.action,
                action_type: data.action_type || null,
                action_description: data.action_description || null,
                entity_type: data.entity_type || null,
                entity_id: data.entity_id || null,
                old_values: data.old_values || null,
                new_values: data.new_values || null,
                metadata: data.metadata || null,
                ip_address: data.ip_address || null,
                user_agent: data.user_agent || null,
                status: data.status || 'Success',
                risk_level: data.risk_level || 'Low',
                is_sensitive: data.is_sensitive || false,
                performed_at: data.performed_at ? new Date(data.performed_at) : new Date()
            }
        });

        SocketService.emitToSchool(schoolId, 'audit:updated', { action: 'create_log', logId: log.id });
        return log;
    }

    static async getLogs(schoolId: string, branchId: string | undefined, filters: any) {
        const { startDate, endDate, actionType, riskLevel, searchTerm, limit = 500 } = filters;

        const where: any = {
            school_id: schoolId
        };

        if (branchId && branchId !== 'all') {
            where.branch_id = branchId;
        }

        if (startDate || endDate) {
            where.performed_at = {};
            if (startDate) where.performed_at.gte = new Date(startDate);
            if (endDate) where.performed_at.lte = new Date(endDate);
        }

        if (actionType && actionType !== 'all') {
            where.action_type = actionType;
        }

        if (riskLevel && riskLevel !== 'all') {
            where.risk_level = riskLevel;
        }

        if (searchTerm) {
            where.OR = [
                { action_description: { contains: searchTerm, mode: 'insensitive' } },
                { entity_type: { contains: searchTerm, mode: 'insensitive' } },
                { user: { full_name: { contains: searchTerm, mode: 'insensitive' } } },
                { user: { email: { contains: searchTerm, mode: 'insensitive' } } }
            ];
        }

        return await prisma.auditLog.findMany({
            where,
            include: {
                user: {
                    select: {
                        full_name: true,
                        email: true,
                        role: true
                    }
                }
            },
            orderBy: { performed_at: 'desc' },
            take: Number(limit)
        });
    }
}
