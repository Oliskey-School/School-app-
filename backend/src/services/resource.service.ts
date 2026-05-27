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

    static async deleteResource(schoolId: string, id: string) {
        // Tenant-scoped lookup prevents cross-school deletion via known resource id.
        const resource = await prisma.resource.findFirst({ where: { id, school_id: schoolId } });
        if (!resource) {
            const err: any = new Error('Resource not found');
            err.statusCode = 404;
            throw err;
        }
        const result = await prisma.resource.delete({ where: { id: resource.id } });
        SocketService.emitToSchool(resource.school_id, 'resource:updated', { action: 'delete', resourceId: id });
        return result;
    }
}
