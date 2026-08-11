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
