import prisma from '../config/database';
import { SocketService } from './socket.service';

export class AiService {
    static async getGeneratedResources(schoolId: string, branchId: string | undefined, teacherId?: string) {
        const where: any = {
            ...(teacherId ? { teacher_id: teacherId } : {}),
            school_id: schoolId
        };

        if (branchId && branchId !== 'all') {
            where.branch_id = branchId;
        }

        return prisma.generatedResource.findMany({
            where,
            orderBy: { updated_at: 'desc' }
        });
    }

    /**
     * Upserts one saved planner row for the signed-in teacher.
     *
     * Ownership and scope come from the session, never the body: the teacher is
     * the caller's own teacher record, school and branch come from the token.
     * The body used to supply teacher_id and was spread straight into the row,
     * so any caller could write into (or overwrite) another teacher's plans, or
     * set school_id/branch_id/id themselves.
     */
    static async saveGeneratedResource(schoolId: string, branchId: string | undefined, resourceData: any, userId: string) {
        const teacher = userId
            ? await prisma.teacher.findUnique({ where: { user_id: userId }, select: { id: true } })
            : null;
        if (!teacher) {
            throw Object.assign(new Error('Only teachers can save lesson plans.'), { status: 403 });
        }

        const text = (v: any, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : '');
        const subject = text(resourceData?.subject, 200);
        const className = text(resourceData?.class_name, 200);
        const contentType = text(resourceData?.content_type, 50);
        if (!subject || !className || !contentType) {
            throw Object.assign(new Error('Subject, class and content type are required.'), { status: 400 });
        }
        // The only fields a caller may set. Everything else is server-owned.
        const editable: { content: string | null; title?: string | null } = {
            content: typeof resourceData?.content === 'string' ? resourceData.content : null,
        };
        if (resourceData?.title !== undefined) editable.title = text(resourceData.title, 300) || null;

        // content_type must be part of the match — a teacher's saved "scheme"
        // and their saved "generated_resources" for the SAME subject/class are
        // different rows. Without this they collide on one record and each save
        // silently overwrites the other.
        const where: any = {
            teacher_id: teacher.id,
            subject,
            class_name: className,
            content_type: contentType,
            school_id: schoolId
        };

        if (branchId && branchId !== 'all') {
            where.branch_id = branchId;
        }

        const existing = await prisma.generatedResource.findFirst({ where });

        if (existing) {
            const result = await prisma.generatedResource.update({
                where: { id: existing.id },
                data: { ...editable, updated_at: new Date(), updated_by: userId }
            });
            SocketService.emitToSchool(schoolId, 'academic:updated', { action: 'update_ai_resource', resourceId: existing.id });
            return result;
        } else {
            const insertData: any = {
                ...editable,
                teacher_id: teacher.id,
                subject,
                class_name: className,
                content_type: contentType,
                school_id: schoolId,
                created_by: userId,
            };
            if (branchId && branchId !== 'all') {
                insertData.branch_id = branchId;
            }
            const result = await prisma.generatedResource.create({ data: insertData });
            SocketService.emitToSchool(schoolId, 'academic:updated', { action: 'create_ai_resource', resourceId: result.id });
            return result;
        }
    }
}
