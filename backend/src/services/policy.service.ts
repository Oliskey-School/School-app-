import prisma from '../config/database';
import { SocketService } from './socket.service';

export class PolicyService {
    static async getPolicies(schoolId: string) {
        return prisma.schoolPolicy.findMany({
            where: { school_id: schoolId },
            orderBy: { created_at: 'desc' }
        });
    }

    static async createPolicy(schoolId: string, data: any) {
        const policy = await prisma.schoolPolicy.create({
            data: {
                ...data,
                school_id: schoolId
            }
        });

        SocketService.emitToSchool(schoolId, 'notice:updated', { action: 'create_policy', policyId: policy.id });
        return policy;
    }

    static async deletePolicy(schoolId: string, id: string) {
        const result = await prisma.schoolPolicy.deleteMany({
            where: { id, school_id: schoolId }
        });

        SocketService.emitToSchool(schoolId, 'notice:updated', { action: 'delete_policy', policyId: id });
        return result;
    }

    static async getPermissionSlips(schoolId: string) {
        return prisma.permissionSlip.findMany({
            where: { school_id: schoolId },
            orderBy: { created_at: 'desc' }
        });
    }

    static async createPermissionSlip(schoolId: string, data: any) {
        const slip = await prisma.permissionSlip.create({
            data: {
                ...data,
                school_id: schoolId
            }
        });

        SocketService.emitToSchool(schoolId, 'notice:updated', { action: 'create_slip', slipId: slip.id });
        return slip;
    }

    static async bulkCreatePermissionSlips(schoolId: string, slips: any[]) {
        const result = await prisma.permissionSlip.createMany({
            data: slips.map(s => ({ ...s, school_id: schoolId }))
        });

        SocketService.emitToSchool(schoolId, 'notice:updated', { action: 'bulk_create_slips' });
        return result;
    }

    static async updatePermissionSlip(schoolId: string, id: string, updates: any) {
        const result = await prisma.permissionSlip.updateMany({
            where: { id, school_id: schoolId },
            data: updates
        });

        SocketService.emitToSchool(schoolId, 'notice:updated', { action: 'update_slip', slipId: id });
        return result;
    }

    static async deletePermissionSlip(schoolId: string, id: string) {
        const result = await prisma.permissionSlip.deleteMany({
            where: { id, school_id: schoolId }
        });

        SocketService.emitToSchool(schoolId, 'notice:updated', { action: 'delete_slip', slipId: id });
        return result;
    }
}
