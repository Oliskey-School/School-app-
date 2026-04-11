import prisma from '../config/database';
import { SocketService } from './socket.service';

export class TimetableService {
    static async getTimetable(schoolId: string, branchId: string | undefined, className?: string, teacherId?: string) {
        const whereClause: any = { school_id: schoolId };

        if (branchId && branchId !== 'all') {
            whereClause.OR = [
                { branch_id: branchId },
                { branch_id: null }
            ];
        }

        if (className) {
            whereClause.class_name = { contains: className, mode: 'insensitive' };
        }

        if (teacherId) {
            whereClause.teacher_id = teacherId;
        }

        return await prisma.timetable.findMany({
            where: whereClause,
            orderBy: { start_time: 'asc' }
        });
    }

    static async createTimetable(schoolId: string, data: any) {
        const entry = await prisma.timetable.create({
            data: {
                ...data,
                school_id: schoolId
            }
        });

        SocketService.emitToSchool(schoolId, 'timetable:updated', { action: 'create', entryId: entry.id });
        return entry;
    }

    static async updateTimetable(schoolId: string, id: string, data: any) {
        const entry = await prisma.timetable.update({
            where: { id, school_id: schoolId },
            data: {
                ...data,
                updated_at: new Date()
            }
        });

        SocketService.emitToSchool(schoolId, 'timetable:updated', { action: 'update', entryId: id });
        return entry;
    }

    static async deleteTimetable(schoolId: string, id: string) {
        const result = await prisma.timetable.delete({
            where: { id, school_id: schoolId }
        });

        SocketService.emitToSchool(schoolId, 'timetable:updated', { action: 'delete', entryId: id });
        return result;
    }

    static async deleteTimetableByClass(schoolId: string, classId: string) {
        const result = await (prisma as any).timetable.deleteMany({
            where: { class_id: classId, school_id: schoolId }
        });

        SocketService.emitToSchool(schoolId, 'timetable:updated', { action: 'delete_by_class', classId });
        return result;
    }

    static async checkTeacherConflict(schoolId: string, data: { teacherId: string, day: string, startTime: string, endTime: string, excludeClassId?: string }) {
        const conflict = await (prisma as any).timetable.findFirst({
            where: {
                school_id: schoolId,
                teacher_id: data.teacherId,
                day: data.day,
                start_time: data.startTime,
                class_id: data.excludeClassId ? { not: data.excludeClassId } : undefined
            },
            include: {
                class: { select: { name: true } }
            }
        });

        if (conflict) {
            return {
                conflict: true,
                message: `Teacher is already assigned to class ${(conflict as any).class?.name || 'Unknown'} at this time.`,
                class_name: (conflict as any).class?.name
            };
        }

        return { conflict: false };
    }
}
