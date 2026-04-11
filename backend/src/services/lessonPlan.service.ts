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
        const plan = await prisma.lessonNote.create({
            data: {
                ...planData,
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : null
            }
        });

        SocketService.emitToSchool(schoolId, 'academic:updated', { action: 'create_lesson_plan', planId: plan.id });
        return plan;
    }

    static async updateLessonPlan(schoolId: string, branchId: string | undefined, id: string, updates: any) {
        const where: any = {
            id,
            school_id: schoolId
        };

        if (branchId && branchId !== 'all') {
            where.branch_id = branchId;
        }

        const plan = await prisma.lessonNote.update({
            where,
            data: updates
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
