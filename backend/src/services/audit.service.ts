import prisma from '../config/database';
import { SocketService } from './socket.service';

/**
 * Audit rows for CONFIDENTIAL family referrals are written school-level
 * (branch_id NULL) and flagged is_sensitive, so branch-filtered readers never
 * see them. School-wide readers must still hide them from anyone who is not the
 * school's main admin — a parent, teacher or counselor can reach some of these
 * feeds with no branch filter at all. Pass `canSeeConfidential` = the caller is
 * a school-level (main) admin.
 *
 * Written as an OR of positive conditions rather than NOT(a AND b) so rows with
 * a NULL entity_type are never dropped by SQL three-valued logic.
 */
export function confidentialReferralAuditFilter(canSeeConfidential: boolean): any | null {
    if (canSeeConfidential) return null;
    return {
        OR: [
            { entity_type: null },
            { entity_type: { not: 'FamilyReferral' } },
            { is_sensitive: false },
        ],
    };
}

/**
 * Roles allowed to read audit trails (the audit-log screens and the admin
 * dashboard's recent-activity feed). Branch admins are included and stay
 * limited to their branch by getEffectiveBranchId at each reader.
 */
export const AUDIT_READER_ROLES = ['ADMIN', 'PROPRIETOR', 'SUPER_ADMIN'];
export function canReadAuditTrail(user: any): boolean {
    return AUDIT_READER_ROLES.includes(String(user?.role || '').toUpperCase());
}

/** True when the request comes from the school's main (school-level) admin. */
export function isMainSchoolAdmin(user: any): boolean {
    return !!user?.is_main_admin && ['ADMIN', 'PROPRIETOR', 'SUPER_ADMIN'].includes(String(user?.role || '').toUpperCase());
}

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

    static async getLogs(schoolId: string, branchId: string | undefined, filters: any, canSeeConfidential = false) {
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

        const confidential = confidentialReferralAuditFilter(canSeeConfidential);
        if (confidential) where.AND = [confidential];

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
