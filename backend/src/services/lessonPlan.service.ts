import prisma from '../config/database';
import { SocketService } from './socket.service';

export class LessonPlanService {
    static async getLessonPlans(schoolId: string, branchId: string | undefined, teacherId?: string) {
        const where: any = {
            school_id: schoolId
        };

        if (teacherId) {
            where.teacher_id = teacherId;
        }

        if (branchId && branchId !== 'all') {
            where.OR = [
                { branch_id: branchId },
                { branch_id: null }
            ];
        }

        return await prisma.lessonNote.findMany({
            where,
            orderBy: { created_at: 'desc' }
        });
    }

    static async createLessonPlan(schoolId: string, branchId: string | undefined, planData: any) {
        // Map camelCase fields to snake_case for Prisma
        // Destructure ALL camelCase variants so they don't leak into the spread
        const { teacherId, classId, subjectId, fileUrl, schoolId: _s, branchId: _b, ...rest } = planData;
        
        const plan = await prisma.lessonNote.create({
            data: {
                ...rest,
                teacher_id: teacherId,
                class_id: classId,
                subject_id: subjectId,
                file_url: fileUrl,
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : null
            }
        });

        SocketService.emitToSchool(schoolId, 'academic:updated', { action: 'create_lesson_plan', planId: plan.id });
        return plan;
    }

    static async updateLessonPlan(schoolId: string, branchId: string | undefined, id: string, updates: any) {
        const { teacherId, classId, subjectId, fileUrl, ...rest } = updates;
        const data: any = { ...rest };
        if (teacherId) data.teacher_id = teacherId;
        if (classId) data.class_id = classId;
        if (subjectId) data.subject_id = subjectId;
        if (fileUrl) data.file_url = fileUrl;

        const where: any = {
            id,
            school_id: schoolId
        };

        if (branchId && branchId !== 'all') {
            where.branch_id = branchId;
        }

        const plan = await prisma.lessonNote.update({
            where,
            data
        });

        SocketService.emitToSchool(schoolId, 'academic:updated', { action: 'update_lesson_plan', planId: id });
        return plan;
    }

    static async deleteLessonPlan(schoolId: string, branchId: string | undefined, id: string) {
        const where: any = {
            id,
            school_id: schoolId
        };

        if (branchId && branchId !== 'all') {
            where.branch_id = branchId;
        }

        const result = await prisma.lessonNote.delete({ where });
        SocketService.emitToSchool(schoolId, 'academic:updated', { action: 'delete_lesson_plan', planId: id });
        return true;
    }
}
