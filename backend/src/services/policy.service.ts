import prisma from '../config/database';
import { SocketService } from './socket.service';

export class PolicyService {
    static async getPolicies(schoolId: string, branchId?: string) {
        return prisma.schoolPolicy.findMany({
            where: { school_id: schoolId, ...(branchId ? { branch_id: branchId } : {}) },
            orderBy: { created_at: 'desc' }
        });
    }

    static async createPolicy(schoolId: string, branchId: string | undefined, data: any) {
        const policy = await prisma.schoolPolicy.create({
            data: {
                ...data,
                school_id: schoolId,
                branch_id: branchId || data.branch_id || null,
            }
        });

        SocketService.emitToSchool(schoolId, 'notice:updated', { action: 'create_policy', policyId: policy.id });
        return policy;
    }

    static async deletePolicy(schoolId: string, branchId: string | undefined, id: string) {
        const result = await prisma.schoolPolicy.deleteMany({
            where: { id, school_id: schoolId, ...(branchId ? { branch_id: branchId } : {}) }
        });

        SocketService.emitToSchool(schoolId, 'notice:updated', { action: 'delete_policy', policyId: id });
        return result;
    }

    static async getPermissionSlips(schoolId: string, branchId?: string) {
        return prisma.permissionSlip.findMany({
            where: { school_id: schoolId, ...(branchId ? { branch_id: branchId } : {}) },
            orderBy: { created_at: 'desc' }
        });
    }

    // A PermissionSlip row is a school-wide consent form: it has no student_id or
    // parent_id, only one shared `status`. A parent's sign-off is therefore
    // recorded as a per-student ParentalConsent row, NOT by mutating the slip —
    // which previously flipped the form for every family in the school.
    static consentTypeFor(slipId: string) {
        return `permission_slip:${slipId}`;
    }

    static async recordParentConsent(
        schoolId: string,
        branchId: string | undefined,
        slipId: string,
        studentIds: string[],
        parentName: string,
        status: string
    ) {
        const consent_type = PolicyService.consentTypeFor(slipId);
        const now = new Date();

        for (const student_id of studentIds) {
            const existing = await prisma.parentalConsent.findFirst({
                where: { school_id: schoolId, student_id, consent_type }
            });

            const data: any = {
                status,
                parent_name: parentName,
                granted_at: status === 'Approved' ? now : null,
                revoked_at: status === 'Rejected' ? now : null,
            };

            if (existing) {
                await prisma.parentalConsent.update({ where: { id: existing.id }, data });
            } else {
                await prisma.parentalConsent.create({
                    data: {
                        ...data,
                        school_id: schoolId,
                        branch_id: branchId || null,
                        student_id,
                        consent_type,
                    }
                });
            }
        }

        SocketService.emitToSchool(schoolId, 'notice:updated', { action: 'parent_consent', slipId });
        return { recorded: studentIds.length };
    }

    // Overlays THIS parent's own consent onto the shared slips, so the list shows
    // what they personally signed rather than the school-wide admin status.
    static async getPermissionSlipsForParent(schoolId: string, branchId: string | undefined, studentIds: string[]) {
        const slips = await PolicyService.getPermissionSlips(schoolId, branchId);
        if (studentIds.length === 0) return slips;

        const consents = await prisma.parentalConsent.findMany({
            where: {
                school_id: schoolId,
                student_id: { in: studentIds },
                consent_type: { startsWith: 'permission_slip:' }
            },
            select: { consent_type: true, status: true }
        });
        const byType = new Map(consents.map(c => [c.consent_type, c.status]));

        return slips.map(slip => {
            const mine = byType.get(PolicyService.consentTypeFor(slip.id));
            return mine ? { ...slip, status: mine } : slip;
        });
    }

    static async createPermissionSlip(schoolId: string, branchId: string | undefined, data: any) {
        const slip = await prisma.permissionSlip.create({
            data: {
                ...data,
                school_id: schoolId,
                branch_id: branchId || data.branch_id || null,
            }
        });

        SocketService.emitToSchool(schoolId, 'notice:updated', { action: 'create_slip', slipId: slip.id });
        return slip;
    }

    static async bulkCreatePermissionSlips(schoolId: string, branchId: string | undefined, slips: any[]) {
        const result = await prisma.permissionSlip.createMany({
            data: slips.map(s => ({
                school_id: schoolId,
                title: s.title,
                description: s.description,
                status: s.status || 'active',
                branch_id: branchId || s.branch_id || null,
            }))
        });

        SocketService.emitToSchool(schoolId, 'notice:updated', { action: 'bulk_create_slips' });
        return result;
    }

    static async updatePermissionSlip(schoolId: string, branchId: string | undefined, id: string, updates: any) {
        const result = await prisma.permissionSlip.updateMany({
            where: { id, school_id: schoolId, ...(branchId ? { branch_id: branchId } : {}) },
            data: updates
        });

        SocketService.emitToSchool(schoolId, 'notice:updated', { action: 'update_slip', slipId: id });
        return result;
    }

    static async deletePermissionSlip(schoolId: string, branchId: string | undefined, id: string) {
        const result = await prisma.permissionSlip.deleteMany({
            where: { id, school_id: schoolId, ...(branchId ? { branch_id: branchId } : {}) }
        });

        SocketService.emitToSchool(schoolId, 'notice:updated', { action: 'delete_slip', slipId: id });
        return result;
    }
}
