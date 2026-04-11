import prisma from '../config/database';
import { SocketService } from './socket.service';

export class AiService {
    static async getGeneratedResources(schoolId: string, branchId: string | undefined, teacherId: string) {
        const where: any = {
            teacher_id: teacherId,
            school_id: schoolId
        };

        if (branchId && branchId !== 'all') {
            where.OR = [
                { branch_id: branchId },
                { branch_id: null }
            ];
        }

        return prisma.generatedResource.findMany({
            where,
            orderBy: { updated_at: 'desc' }
        });
    }

    static async saveGeneratedResource(schoolId: string, branchId: string | undefined, resourceData: any) {
        const where: any = {
            teacher_id: resourceData.teacher_id,
            subject: resourceData.subject,
            class_name: resourceData.class_name,
            school_id: schoolId
        };

        if (branchId && branchId !== 'all') {
            where.OR = [
                { branch_id: branchId },
                { branch_id: null }
            ];
        }

        const existing = await prisma.generatedResource.findFirst({ where });

        if (existing) {
            const result = await prisma.generatedResource.update({
                where: { id: existing.id },
                data: { ...resourceData, updated_at: new Date() }
            });
            SocketService.emitToSchool(schoolId, 'academic:updated', { action: 'update_ai_resource', resourceId: existing.id });
            return result;
        } else {
            const insertData: any = { ...resourceData, school_id: schoolId };
            if (branchId && branchId !== 'all') {
                insertData.branch_id = branchId;
            }
            const result = await prisma.generatedResource.create({ data: insertData });
            SocketService.emitToSchool(schoolId, 'academic:updated', { action: 'create_ai_resource', resourceId: result.id });
            return result;
        }
    }
}
