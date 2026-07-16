import prisma from '../config/database';
import { NotificationService } from './notification.service';
import { SocketService } from './socket.service';

function isoDayOfWeek(dateStr: string): number {
    const d = new Date(`${dateStr}T12:00:00`);
    const day = d.getDay();
    return day === 0 ? 7 : day; // Timetable: 1=Mon..7=Sun
}

function timeOverlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
    return aStart < bEnd && bStart < aEnd;
}

export class SubstituteService {
    /**
     * Every period today (or a given date) that needs a substitute: teachers
     * marked Absent, cross-referenced against their published timetable,
     * excluding periods already covered by an active assignment. Each period
     * comes with ranked suggestions — free teachers only, same-subject /
     * curriculum-eligible ones first.
     */
    static async getCoverageNeeded(schoolId: string, branchId: string | undefined, date: string) {
        const absentAttendance = await (prisma as any).teacherAttendance.findMany({
            where: {
                school_id: schoolId,
                date,
                status: 'Absent',
                ...(branchId && branchId !== 'all' ? { branch_id: branchId } : {}),
            },
            include: { teacher: { select: { id: true, full_name: true } } },
        });
        if (absentAttendance.length === 0) return [];

        const dow = isoDayOfWeek(date);
        const absentTeacherIds = absentAttendance.map((a: any) => a.teacher_id);

        const [periods, existingAssignments, allTeachers] = await Promise.all([
            prisma.timetable.findMany({
                where: {
                    school_id: schoolId,
                    teacher_id: { in: absentTeacherIds },
                    day_of_week: dow,
                    status: 'Published',
                    deleted_at: null,
                    ...(branchId && branchId !== 'all' ? { branch_id: branchId } : {}),
                },
                include: { class: { select: { id: true, name: true } } },
                orderBy: { start_time: 'asc' },
            }),
            (prisma as any).substituteAssignment.findMany({
                where: { school_id: schoolId, date: new Date(`${date}T00:00:00Z`), status: { in: ['Assigned', 'Accepted'] } },
            }),
            prisma.teacher.findMany({
                where: {
                    school_id: schoolId,
                    deleted_at: null,
                    user: { role: 'TEACHER' as any },
                    ...(branchId && branchId !== 'all' ? { branch_id: branchId } : {}),
                },
                select: { id: true, full_name: true, subject_specialty: true, curriculum_eligibility: true, avatar_url: true },
            }),
        ]);

        const coveredTimetableIds = new Set(existingAssignments.map((a: any) => a.timetable_id));
        // Everyone's OWN timetable for the day, to determine who is free at a given time.
        const allDayEntries = await prisma.timetable.findMany({
            where: { school_id: schoolId, day_of_week: dow, status: 'Published', deleted_at: null },
            select: { teacher_id: true, start_time: true, end_time: true },
        });

        const result = [];
        for (const period of periods) {
            if (coveredTimetableIds.has(period.id)) continue;
            const absentTeacher = absentAttendance.find((a: any) => a.teacher_id === period.teacher_id)?.teacher;

            const busyTeacherIds = new Set(
                allDayEntries
                    .filter(e => e.teacher_id && timeOverlaps(period.start_time, period.end_time, e.start_time, e.end_time))
                    .map(e => e.teacher_id)
            );

            const suggestions = allTeachers
                .filter(t => t.id !== period.teacher_id && !busyTeacherIds.has(t.id))
                .map(t => {
                    const subjectMatch = t.subject_specialty?.some((s: string) => s.toLowerCase() === period.subject.toLowerCase());
                    const curriculumMatch = t.curriculum_eligibility?.length > 0;
                    const score = subjectMatch ? 2 : curriculumMatch ? 1 : 0;
                    return {
                        teacher_id: t.id, name: t.full_name, avatar_url: t.avatar_url,
                        match_reason: subjectMatch ? 'Teaches this subject' : curriculumMatch ? 'Curriculum eligible' : 'Free period',
                        score,
                    };
                })
                .sort((a, b) => b.score - a.score)
                .slice(0, 8);

            result.push({
                timetable_id: period.id,
                date,
                subject: period.subject,
                class_name: period.class?.name || period.class_name,
                class_id: period.class_id,
                start_time: period.start_time,
                end_time: period.end_time,
                room: period.room,
                original_teacher_id: period.teacher_id,
                original_teacher_name: absentTeacher?.full_name || 'Unknown',
                suggestions,
            });
        }
        return result;
    }

    /** One-click assign: creates the record and notifies the substitute,
     * the class's students + parents, and the original absent teacher. */
    static async assignSubstitute(schoolId: string, branchId: string | undefined, data: any, actorId: string) {
        if (!data.timetable_id) throw new Error('A timetable period is required');
        if (!data.substitute_teacher_id) throw new Error('A substitute teacher is required');
        if (!data.date) throw new Error('Date is required');

        const period = await prisma.timetable.findFirst({ where: { id: data.timetable_id, school_id: schoolId, deleted_at: null } });
        if (!period) throw new Error('Timetable period not found');

        const substitute = await prisma.teacher.findFirst({ where: { id: data.substitute_teacher_id, school_id: schoolId, deleted_at: null } });
        if (!substitute) throw new Error('Substitute teacher not found');
        if (substitute.id === period.teacher_id) throw new Error('The substitute cannot be the same as the absent teacher');

        const dateObj = new Date(`${data.date}T00:00:00Z`);
        const dow = isoDayOfWeek(data.date);

        // Guard against double-booking: is the chosen substitute free at this
        // exact time? (Suggestions are pre-filtered, but the admin can pick
        // anyone, so this is re-validated server-side.)
        const conflict = await prisma.timetable.findFirst({
            where: {
                school_id: schoolId, teacher_id: substitute.id, day_of_week: dow, status: 'Published', deleted_at: null,
                start_time: { lt: period.end_time }, end_time: { gt: period.start_time },
            },
        });
        if (conflict) throw new Error(`${substitute.full_name} already has a class at this time`);

        const existing = await (prisma as any).substituteAssignment.findFirst({
            where: { timetable_id: data.timetable_id, date: dateObj, status: { in: ['Assigned', 'Accepted'] } },
        });
        if (existing) throw new Error('This period already has an active substitute assigned');

        // Best-effort subject match by name — Timetable stores subject as a
        // plain string, not a Subject FK.
        const subjectRow = await prisma.subject.findFirst({ where: { school_id: schoolId, name: { equals: period.subject, mode: 'insensitive' } }, select: { id: true } });

        let assignment;
        try {
            assignment = await (prisma as any).substituteAssignment.create({
                data: {
                    school_id: schoolId,
                    branch_id: period.branch_id ?? (branchId && branchId !== 'all' ? branchId : null),
                    original_teacher_id: period.teacher_id,
                    substitute_teacher_id: substitute.id,
                    class_id: period.class_id,
                    subject_id: subjectRow?.id ?? null,
                    timetable_id: period.id,
                    date: dateObj,
                    start_time: period.start_time,
                    end_time: period.end_time,
                    status: 'Assigned',
                    notified_at: new Date(),
                    created_by: actorId,
                },
            });
        } catch (err: any) {
            if (err?.code === 'P2002') throw new Error('This period already has an active substitute assigned');
            throw err;
        }

        await this.notifyAssignment(schoolId, branchId, assignment, period);
        SocketService.emitToSchool(schoolId, 'substitute:assigned', { assignmentId: assignment.id, timetableId: period.id });
        return assignment;
    }

    private static async notifyAssignment(schoolId: string, branchId: string | undefined, assignment: any, period: any) {
        const [substitute, original, roster] = await Promise.all([
            prisma.teacher.findUnique({ where: { id: assignment.substitute_teacher_id }, select: { user_id: true, full_name: true } }),
            prisma.teacher.findUnique({ where: { id: assignment.original_teacher_id }, select: { user_id: true } }),
            period.class_id
                ? prisma.studentEnrollment.findMany({
                    where: { class_id: period.class_id, status: 'Active', deleted_at: null },
                    include: { student: { select: { user_id: true, parents: { include: { parent: { select: { user_id: true } } } } } } },
                })
                : Promise.resolve([]),
        ]);

        const className = period.class_name || 'your class';
        const when = `${assignment.start_time}–${assignment.end_time}`;

        if (substitute?.user_id) {
            await NotificationService.createNotification(schoolId, branchId, {
                user_id: substitute.user_id,
                title: 'Substitute Teaching Assignment',
                message: `You've been assigned to cover ${period.subject} for ${className} today, ${when}.`,
                category: 'System',
            }).catch(err => console.warn('⚠️ [Substitute] notify substitute failed:', err.message));
        }
        if (original?.user_id) {
            await NotificationService.createNotification(schoolId, branchId, {
                user_id: original.user_id,
                title: 'Your Class Is Covered',
                message: `${substitute?.full_name || 'A substitute'} will cover your ${period.subject} class (${className}) today, ${when}.`,
                category: 'System',
            }).catch(err => console.warn('⚠️ [Substitute] notify original teacher failed:', err.message));
        }
        for (const enrollment of roster) {
            const studentUserId = enrollment.student?.user_id;
            if (studentUserId) {
                await NotificationService.createNotification(schoolId, branchId, {
                    user_id: studentUserId,
                    title: 'Class Update',
                    message: `${substitute?.full_name || 'A substitute teacher'} is covering ${period.subject} today, ${when}.`,
                    category: 'System',
                }).catch(err => console.warn('⚠️ [Substitute] notify student failed:', err.message));
            }
            for (const link of enrollment.student?.parents || []) {
                if (link.parent?.user_id) {
                    await NotificationService.createNotification(schoolId, branchId, {
                        user_id: link.parent.user_id,
                        title: 'Class Update',
                        message: `${substitute?.full_name || 'A substitute teacher'} is covering your child's ${period.subject} class today, ${when}.`,
                        category: 'System',
                    }).catch(err => console.warn('⚠️ [Substitute] notify parent failed:', err.message));
                }
            }
        }
    }

    /** Called after a teacher is marked Absent for today — tells admins how
     * many periods need coverage without requiring them to go look. */
    static async notifyAdminsOfAbsence(schoolId: string, branchId: string | undefined, teacherId: string, date: string) {
        const dow = isoDayOfWeek(date);
        const [teacher, periodCount] = await Promise.all([
            prisma.teacher.findUnique({ where: { id: teacherId }, select: { full_name: true } }),
            prisma.timetable.count({ where: { school_id: schoolId, teacher_id: teacherId, day_of_week: dow, status: 'Published', deleted_at: null } }),
        ]);
        if (periodCount === 0) return;

        const admins = await prisma.user.findMany({
            where: { school_id: schoolId, role: { in: ['ADMIN', 'PROPRIETOR'] as any }, ...(branchId && branchId !== 'all' ? { OR: [{ branch_id: branchId }, { branch_id: null }] } : {}) },
            select: { id: true },
        });
        for (const admin of admins) {
            await NotificationService.createNotification(schoolId, branchId, {
                user_id: admin.id,
                title: 'Substitute Coverage Needed',
                message: `${teacher?.full_name || 'A teacher'} is absent today — ${periodCount} period${periodCount > 1 ? 's need' : ' needs'} a substitute.`,
                category: 'System',
            }).catch(err => console.warn('⚠️ [Substitute] admin absence notification failed:', err.message));
        }
    }

    static async respondToAssignment(schoolId: string, assignmentId: string, teacherId: string, response: 'Accepted' | 'Declined') {
        const assignment = await (prisma as any).substituteAssignment.findFirst({ where: { id: assignmentId, school_id: schoolId, deleted_at: null } });
        if (!assignment) throw new Error('Assignment not found');
        if (assignment.substitute_teacher_id !== teacherId) throw new Error('This assignment is not addressed to you');
        if (assignment.status !== 'Assigned') throw new Error('This assignment has already been responded to');

        const updated = await (prisma as any).substituteAssignment.update({
            where: { id: assignmentId },
            data: { status: response, responded_at: new Date() },
        });

        if (response === 'Declined') {
            const admins = await prisma.user.findMany({
                where: { school_id: schoolId, role: { in: ['ADMIN', 'PROPRIETOR'] as any } },
                select: { id: true },
            });
            for (const admin of admins) {
                await NotificationService.createNotification(schoolId, assignment.branch_id ?? undefined, {
                    user_id: admin.id,
                    title: 'Substitute Declined — Reassignment Needed',
                    message: `A substitute teacher declined coverage for a period on ${assignment.date.toISOString().slice(0, 10)}. Please reassign.`,
                    category: 'System',
                }).catch(err => console.warn('⚠️ [Substitute] decline notification failed:', err.message));
            }
        }
        SocketService.emitToSchool(schoolId, 'substitute:assigned', { assignmentId, status: response });
        return updated;
    }

    static async getMyAssignments(schoolId: string, teacherId: string) {
        const rows = await (prisma as any).substituteAssignment.findMany({
            where: { school_id: schoolId, substitute_teacher_id: teacherId, deleted_at: null },
            orderBy: { date: 'desc' },
        });
        const teacherIds = Array.from(new Set(rows.map((r: any) => r.original_teacher_id)));
        const classIds = Array.from(new Set(rows.map((r: any) => r.class_id).filter(Boolean)));
        const [teachers, classes] = await Promise.all([
            prisma.teacher.findMany({ where: { id: { in: teacherIds as string[] } }, select: { id: true, full_name: true } }),
            prisma.class.findMany({ where: { id: { in: classIds as string[] } }, select: { id: true, name: true } }),
        ]);
        const teacherMap = new Map(teachers.map(t => [t.id, t.full_name]));
        const classMap = new Map(classes.map(c => [c.id, c.name]));

        return rows.map((r: any) => ({
            ...r,
            original_teacher_name: teacherMap.get(r.original_teacher_id) || 'Unknown',
            class_name: classMap.get(r.class_id) || 'Unknown',
        }));
    }

    static async getHistory(schoolId: string, branchId: string | undefined, filters: { date?: string } = {}) {
        const where: any = { school_id: schoolId, deleted_at: null };
        if (branchId && branchId !== 'all') where.branch_id = branchId;
        if (filters.date) where.date = new Date(`${filters.date}T00:00:00Z`);

        const rows = await (prisma as any).substituteAssignment.findMany({ where, orderBy: { date: 'desc' } });
        const teacherIds = Array.from(new Set([...rows.map((r: any) => r.original_teacher_id), ...rows.map((r: any) => r.substitute_teacher_id)]));
        const classIds = Array.from(new Set(rows.map((r: any) => r.class_id).filter(Boolean)));
        const [teachers, classes] = await Promise.all([
            prisma.teacher.findMany({ where: { id: { in: teacherIds as string[] } }, select: { id: true, full_name: true } }),
            prisma.class.findMany({ where: { id: { in: classIds as string[] } }, select: { id: true, name: true } }),
        ]);
        const teacherMap = new Map(teachers.map(t => [t.id, t.full_name]));
        const classMap = new Map(classes.map(c => [c.id, c.name]));

        return rows.map((r: any) => ({
            ...r,
            original_teacher_name: teacherMap.get(r.original_teacher_id) || 'Unknown',
            substitute_teacher_name: teacherMap.get(r.substitute_teacher_id) || 'Unknown',
            class_name: classMap.get(r.class_id) || 'Unknown',
        }));
    }
}
