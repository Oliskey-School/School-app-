import prisma from '../config/database';
import { SocketService } from './socket.service';

export class ResourceService {
    static async createResource(schoolId: string, branchId: string | undefined, resourceData: any) {
        const insertData: any = {
            ...resourceData,
            school_id: schoolId
        };

        if (branchId && branchId !== 'all') {
            insertData.branch_id = branchId;
        }

        const resource = await prisma.resource.create({
            data: insertData,
            include: { teacher: { select: { full_name: true } } }
        });

        SocketService.emitToSchool(schoolId, 'resource:updated', { action: 'create', resourceId: resource.id });
        return resource;
    }

    static async getResources(schoolId: string, branchId: string | undefined, filters: any = {}) {
        const where: any = { school_id: schoolId };

        if (branchId && branchId !== 'all') {
            where.branch_id = branchId;
        }

        if (filters.category) {
            where.category = filters.category;
        }

        if (filters.subject) {
            where.subject = filters.subject;
        }

        return prisma.resource.findMany({
            where,
            include: { teacher: { select: { full_name: true } } },
            orderBy: { created_at: 'desc' }
        });
    }

    static async deleteResource(id: string) {
        const resource = await prisma.resource.findUnique({ where: { id } });
        const result = await prisma.resource.delete({
            where: { id }
        });

        if (resource) {
            SocketService.emitToSchool(resource.school_id, 'resource:updated', { action: 'delete', resourceId: id });
        }
        return result;
    }
}
