import prisma from '../config/database';
import { SocketService } from './socket.service';

export class ResourceService {
    static async createResource(schoolId: string, branchId: string | undefined, resourceData: any) {
        // Only pick fields that exist in the Resource schema — discard extras like grade, language, is_public
        const insertData: any = {
            school_id: schoolId,
            ...(resourceData.title          !== undefined && { title:         resourceData.title }),
            ...(resourceData.description    !== undefined && { description:   resourceData.description }),
            ...(resourceData.type           !== undefined && { type:          resourceData.type }),
            ...(resourceData.url            !== undefined && { url:           resourceData.url }),
            ...(resourceData.file_type      !== undefined && { file_type:     resourceData.file_type }),
            ...(resourceData.size           !== undefined && { size:          resourceData.size }),
            ...(resourceData.category       !== undefined && { category:      resourceData.category }),
            ...(resourceData.subject        !== undefined && { subject:       resourceData.subject }),
            ...(resourceData.class_id       !== undefined && { class_id:      resourceData.class_id }),
            ...(resourceData.tags           !== undefined && { tags:          resourceData.tags }),
            ...(resourceData.thumbnail_url  !== undefined && { thumbnail_url: resourceData.thumbnail_url }),
            ...(resourceData.teacher_id     !== undefined && { teacher_id:    resourceData.teacher_id }),
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

    static async deleteResource(schoolId: string, branchId: string | undefined, id: string) {
        // Tenant-scoped lookup prevents cross-school/cross-branch deletion via known resource id.
        const resource = await prisma.resource.findFirst({ where: { id, school_id: schoolId, ...(branchId ? { branch_id: branchId } : {}) } });
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
