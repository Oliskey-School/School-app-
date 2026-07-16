import prisma from '../config/database';
import { SocketService } from './socket.service';

export class TimetableService {
    static async getTimetable(
        schoolId: string,
        branchId: string | undefined,
        className?: string,
        teacherId?: string,
        opts?: { publishedOnly?: boolean }
    ) {
        const whereClause: any = { school_id: schoolId };

        // Teachers/students/parents only see what the admin has published —
        // drafts stay private to the admin until "Publish Live".
        if (opts?.publishedOnly) {
            whereClause.status = 'Published';
        }

        // Strict branch isolation: a specific branch shows ONLY its own rows. Untagged
        // (branch_id: null) rows appear only in the "All Branches" view (branchId
        // undefined), never inside a single branch.
        if (branchId && branchId !== 'all') {
            whereClause.branch_id = branchId;
        }

        if (className) {
            whereClause.class_name = { contains: className, mode: 'insensitive' };
        }

        if (teacherId) {
            // Use ClassTeacher formal assignments to filter — this ensures teachers
            // only see the subjects they are explicitly assigned to teach, not every
            // entry that shares their teacher_id (demo data assigns one teacher_id to
            // everything, so raw teacher_id returns the entire school timetable).
            //
            // IMPORTANT: skip ClassTeacher rows with no subject_id. A null subject_id
            // would produce { class_id } with no subject filter, returning ALL subjects
            // for that class — exactly the bug we're fixing. Only rows that have BOTH
            // class_id AND subject.name generate a valid timetable condition.
            const assignments = await (prisma as any).classTeacher.findMany({
                where: { teacher_id: teacherId, school_id: schoolId, deleted_at: null },
                include: {
                    class: { select: { id: true, name: true } },
                    subject: { select: { name: true } },
                }
            });

            // Match each assignment by class_id OR class_name. Timetable rows are
            // often created against a different class record than the assignment
            // (duplicate class rows with the same name exist, and editor-created
            // rows may carry only class_name) — id-only matching makes assigned
            // periods vanish from the teacher's schedule. Branch isolation still
            // holds: the outer whereClause scopes school_id and branch_id.
            const subjectConditions = assignments
                .filter((a: any) => a.class_id && a.subject?.name)
                .map((a: any) => ({
                    subject: { equals: a.subject.name, mode: 'insensitive' as const },
                    OR: [
                        { class_id: a.class_id },
                        ...(a.class?.name
                            ? [{ class_name: { equals: a.class.name, mode: 'insensitive' as const } }]
                            : []),
                    ],
                }));

            if (subjectConditions.length > 0) {
                whereClause.OR = subjectConditions;
            } else {
                // No valid ClassTeacher assignments found — fall back to direct
                // teacher_id. This handles schools that use the timetable editor to
                // assign teachers without setting up ClassTeacher records first.
                whereClause.teacher_id = teacherId;
            }
        }

        return await prisma.timetable.findMany({
            where: whereClause,
            include: {
                teacher: { select: { full_name: true } },
                class: { select: { name: true } }
            },
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

        // Resolve branch + class from the class itself. The editor sends only
        // class_name (no branch_id), so without this the row would save with
        // branch_id=null and a branch-scoped student/teacher would never see it.
        let branchId = (data.branch_id && data.branch_id !== 'all') ? data.branch_id : null;
        let classId = data.class_id ?? null;
        if ((!branchId || !classId) && (classId || data.class_name)) {
            const cls = await prisma.class.findFirst({
                where: { school_id: schoolId, ...(classId ? { id: classId } : { name: data.class_name }) },
                select: { id: true, branch_id: true },
            });
            if (cls) {
                if (!classId) classId = cls.id;
                if (!branchId) branchId = cls.branch_id ?? null;
            }
        }

        const entry = await prisma.timetable.create({
            data: {
                school_id: schoolId,
                branch_id: branchId,
                class_id: classId,
                class_name: data.class_name ?? null,
                subject: data.subject,
                teacher_id: data.teacher_id ?? null,
                day_of_week: dow,
                start_time: data.start_time,
                end_time: data.end_time,
                room: data.room ?? null,
                classroom_id: data.classroom_id
                    ?? await TimetableService.resolveClassroomId(schoolId, data.room, branchId),
                notes: data.notes ?? null,
                // Publish state — only the Editor's "Publish Live" sends 'Published';
                // everything else (Builder save, draft) stays 'Draft'.
                status: data.status === 'Published' ? 'Published' : 'Draft',
            }
        });

        SocketService.emitToSchool(schoolId, 'timetable:updated', { action: 'create', entryId: entry.id });
        return entry;
    }

    /**
     * QR lesson attendance links lessons to Classroom records, but the
     * timetable UI only captures a free-text room name. Bridge the two by
     * matching the typed room name to a registered classroom (same school,
     * same branch when known) so no timetable UI change is needed.
     */
    static async resolveClassroomId(schoolId: string, room?: string | null, branchId?: string | null): Promise<string | null> {
        if (!room?.trim()) return null;
        const classroom = await (prisma as any).classroom.findFirst({
            where: {
                school_id: schoolId,
                deleted_at: null,
                name: { equals: room.trim(), mode: 'insensitive' },
                ...(branchId ? { branch_id: branchId } : {}),
            },
            select: { id: true }
        });
        return classroom?.id ?? null;
    }

    static async updateTimetable(schoolId: string, id: string, data: any) {
        const DOW: Record<string, number> = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 7 };
        // Resolve day_of_week if a string day name was sent
        const dow = data.day_of_week != null
            ? Number(data.day_of_week)
            : (typeof data.day === 'string' ? (DOW[data.day.toLowerCase()] ?? undefined) : undefined);

        const entry = await prisma.timetable.update({
            where: { id, school_id: schoolId },
            data: {
                // Whitelist valid Timetable columns only — never spread raw input
                ...(data.subject !== undefined && { subject: data.subject }),
                ...(data.class_name !== undefined && { class_name: data.class_name }),
                ...(data.class_id !== undefined && { class_id: data.class_id }),
                ...(data.branch_id !== undefined && { branch_id: data.branch_id }),
                ...(data.teacher_id !== undefined && { teacher_id: data.teacher_id }),
                ...(dow !== undefined && { day_of_week: dow }),
                ...(data.start_time !== undefined && { start_time: data.start_time }),
                ...(data.end_time !== undefined && { end_time: data.end_time }),
                ...(data.room !== undefined && { room: data.room }),
                ...(data.classroom_id !== undefined
                    ? { classroom_id: data.classroom_id || null }
                    : data.room !== undefined
                        ? { classroom_id: await TimetableService.resolveClassroomId(schoolId, data.room, data.branch_id) }
                        : {}),
                ...(data.notes !== undefined && { notes: data.notes }),
                ...(data.status !== undefined && { status: data.status }),
                updated_at: new Date(),
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

    static async deleteTimetableByClass(schoolId: string, identifier: string, branchId?: string) {
        // Try deleting by class_id first, then by class_name for shell classes.
        // Branch-scoped when a branch is given — otherwise a name like "SSS 3"
        // would wipe the same-named class's timetable in every other branch.
        const result = await prisma.timetable.deleteMany({
            where: {
                school_id: schoolId,
                ...(branchId && branchId !== 'all' ? { branch_id: branchId } : {}),
                OR: [
                    { class_id: identifier },
                    { class_name: identifier }
                ]
            }
        });

        SocketService.emitToSchool(schoolId, 'timetable:updated', { action: 'delete_by_class', identifier });
        return result;
    }

    static async notifyPublished(schoolId: string, classNames: string[]) {
        SocketService.emitToSchool(schoolId, 'timetable:published', { class_names: classNames, school_id: schoolId });
    }

    static async checkTeacherConflict(schoolId: string, data: { teacherId: string, day: string, startTime: string, endTime: string, excludeClassId?: string }) {
        const DOW: Record<string, number> = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 7 };
        const dow = typeof data.day === 'string' ? (DOW[data.day.toLowerCase()] ?? null) : null;

        const conflict = await prisma.timetable.findFirst({
            where: {
                school_id: schoolId,
                teacher_id: data.teacherId,
                ...(dow != null ? { day_of_week: dow } : {}),
                start_time: data.startTime,
                deleted_at: null,
            },
            include: {
                class: { select: { name: true } }
            }
        });

        if (conflict) {
            return {
                conflict: true,
                message: `Teacher is already assigned to class ${conflict.class?.name || 'Unknown'} at this time.`,
                class_name: conflict.class?.name
            };
        }

        return { conflict: false };
    }
}
