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
        // Whitelist real Timetable columns — callers may send UI-only fields like
        // `day` (string), `period_index` or `status` which are NOT columns. Map a day
        // NAME to day_of_week (1=Mon..7=Sun) when day_of_week isn't given.
        const DOW: Record<string, number> = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 7 };
        const dow = data.day_of_week != null
            ? Number(data.day_of_week)
            : (typeof data.day === 'string' ? (DOW[data.day.toLowerCase()] ?? null) : null);

        const entry = await prisma.timetable.create({
            data: {
                school_id: schoolId,
                branch_id: (data.branch_id && data.branch_id !== 'all') ? data.branch_id : null,
                class_id: data.class_id ?? null,
                class_name: data.class_name ?? null,
                subject: data.subject,
                teacher_id: data.teacher_id ?? null,
                day_of_week: dow,
                start_time: data.start_time,
                end_time: data.end_time,
                room: data.room ?? null,
                notes: data.notes ?? null,
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

    static async deleteTimetableByClass(schoolId: string, identifier: string) {
        // Try deleting by class_id first, then by class_name for shell classes
        const result = await prisma.timetable.deleteMany({
            where: { 
                school_id: schoolId,
                OR: [
                    { class_id: identifier },
                    { class_name: identifier }
                ]
            }
        });

        SocketService.emitToSchool(schoolId, 'timetable:updated', { action: 'delete_by_class', identifier });
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
