import prisma from '../config/database';
import { SocketService } from './socket.service';

export class LessonPlanService {
    static async getLessonPlans(
        schoolId: string,
        branchId: string | undefined,
        teacherId?: string,
        classId?: string,
        subjectId?: string,
        status?: string
    ) {
        const where: any = { school_id: schoolId };

        if (teacherId) where.teacher_id = teacherId;
        if (classId) where.class_id = classId;
        if (subjectId) where.subject_id = subjectId;
        if (status) where.status = status;

        if (branchId && branchId !== 'all') {
            where.branch_id = branchId;
        }

        return await prisma.lessonNote.findMany({
            where,
            include: {
                teacher: { select: { full_name: true, school_generated_id: true } },
                class: { select: { name: true } },
            },
            orderBy: { created_at: 'desc' }
        });
    }

    static async createLessonPlan(schoolId: string, branchId: string | undefined, planData: any) {
        // Map camelCase fields to snake_case for Prisma
        // Destructure ALL camelCase variants so they don't leak into the spread
        const { teacherId, classId, subjectId, fileUrl, schoolId: _s, branchId: _b, ...rest } = planData;

        // Confirm the class actually belongs to this teacher's school/branch
        // before attaching a lesson plan to it — otherwise a plan could be
        // created against another branch's class by id.
        if (classId) {
            const owned = await prisma.class.findFirst({
                where: { id: classId, school_id: schoolId, ...(branchId && branchId !== 'all' ? { branch_id: branchId } : {}) },
                select: { id: true },
            });
            if (!owned) throw new Error('Class not found in your school/branch');
        }

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

    static async updateLessonPlan(schoolId: string, branchId: string | undefined, id: string, updates: any, ownTeacherId?: string | null) {
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

        // A TEACHER caller (ownTeacherId set) may only edit lesson plans they
        // authored. Admin-tier callers pass ownTeacherId = null and are unrestricted.
        if (ownTeacherId) {
            where.teacher_id = ownTeacherId;
        }

        let plan;
        try {
            plan = await prisma.lessonNote.update({ where, data });
        } catch (e: any) {
            if (ownTeacherId && e?.code === 'P2025') {
                const err: any = new Error('You do not have permission to edit this lesson plan');
                err.status = 403;
                throw err;
            }
            throw e;
        }

        SocketService.emitToSchool(schoolId, 'academic:updated', { action: 'update_lesson_plan', planId: id });
        return plan;
    }

    static async deleteLessonPlan(schoolId: string, branchId: string | undefined, id: string, ownTeacherId?: string | null) {
        const where: any = {
            id,
            school_id: schoolId
        };

        if (branchId && branchId !== 'all') {
            where.branch_id = branchId;
        }

        if (ownTeacherId) {
            where.teacher_id = ownTeacherId;
        }

        try {
            await prisma.lessonNote.delete({ where });
        } catch (e: any) {
            if (ownTeacherId && e?.code === 'P2025') {
                const err: any = new Error('You do not have permission to delete this lesson plan');
                err.status = 403;
                throw err;
            }
            throw e;
        }
        SocketService.emitToSchool(schoolId, 'academic:updated', { action: 'delete_lesson_plan', planId: id });
        return true;
    }
}
