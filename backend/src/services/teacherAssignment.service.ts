import prisma from '../config/database';
import { SocketService } from './socket.service';
import { TimetableService } from './timetable.service';

const DOW: Record<string, number> = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 7 };

function currentSessionTerm(school: { academic_session: string | null; current_term: number | null }) {
    return {
        session: school.academic_session || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
        term: school.current_term || 1,
    };
}

export class TeacherAssignmentService {
    static async getCoTeacherSetting(schoolId: string): Promise<boolean> {
        const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { settings: true } });
        return Boolean((school?.settings as any)?.allow_co_class_teachers);
    }

    static async setCoTeacherSetting(schoolId: string, allow: boolean) {
        const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { settings: true } });
        const settings = { ...(school?.settings as any || {}), allow_co_class_teachers: allow };
        await prisma.school.update({ where: { id: schoolId }, data: { settings } });
        return { allow_co_class_teachers: allow };
    }

    /** Assigns a teacher as Class Teacher for a class. Replaces the current one
     * unless the school allows co-class-teachers. */
    static async assignClassTeacher(schoolId: string, data: any, actorId: string, branchId?: string) {
        const { teacher_id, class_id, effective_date, force } = data;
        if (!teacher_id) throw new Error('Teacher is required');
        if (!class_id) throw new Error('Class is required');

        const [teacher, cls, school] = await Promise.all([
            prisma.teacher.findFirst({ where: { id: teacher_id, school_id: schoolId, deleted_at: null } }),
            prisma.class.findFirst({ where: { id: class_id, school_id: schoolId, deleted_at: null } }),
            prisma.school.findUnique({ where: { id: schoolId }, select: { academic_session: true, current_term: true, settings: true } }),
        ]);
        if (!teacher) throw new Error('Teacher not found');
        if (!cls) throw new Error('Class not found');
        if (branchId && branchId !== 'all' && teacher.branch_id !== branchId) throw new Error('Teacher not found');

        const allowCoTeachers = Boolean((school?.settings as any)?.allow_co_class_teachers);
        const { session, term } = currentSessionTerm(school as any);

        const existing = await prisma.classTeacher.findMany({
            where: { class_id, role: 'class_teacher', status: 'active', deleted_at: null },
        });

        // Same teacher already the (or an) active class teacher here — nothing to do.
        if (existing.some(e => e.teacher_id === teacher_id)) {
            throw new Error(`${teacher.full_name} is already the Class Teacher for this class`);
        }

        if (existing.length > 0 && !allowCoTeachers) {
            if (!force) {
                const current = await prisma.teacher.findUnique({ where: { id: existing[0]!.teacher_id }, select: { full_name: true } });
                const err: any = new Error(`${current?.full_name || 'Another teacher'} is already the Class Teacher for this class. Replace them?`);
                err.requiresConfirmation = true;
                err.currentTeacherName = current?.full_name;
                throw err;
            }
            // Replace: end every existing active class-teacher row for this class.
            await prisma.classTeacher.updateMany({
                where: { id: { in: existing.map(e => e.id) } },
                data: { status: 'ended', ended_at: new Date(), ended_by: actorId },
            });
        }

        const record = await prisma.classTeacher.create({
            data: {
                school_id: schoolId,
                branch_id: cls.branch_id ?? teacher.branch_id ?? null,
                teacher_id, class_id,
                subject_id: null,
                role: 'class_teacher',
                session, term,
                effective_date: effective_date ? new Date(effective_date) : new Date(),
                status: 'active',
                created_by: actorId,
            },
        });

        SocketService.emitToSchool(schoolId, 'teacher:updated', { action: 'class_teacher_assigned', teacherId: teacher_id, classId: class_id });
        return record;
    }

    /** Assigns a teacher as Subject Teacher for one or more classes. A teacher
     * may teach the same subject across many classes; a class may have many
     * subject teachers (one per subject). Duplicate (teacher+class+subject)
     * active assignments are rejected; timetable conflicts are reported but
     * not blocking unless `force` is false and a conflict exists. */
    static async assignSubjectTeacher(schoolId: string, data: any, actorId: string, branchId?: string) {
        const { teacher_id, subject_id, class_ids, periods_per_week, effective_date, timetable_slots, force } = data;
        if (!teacher_id) throw new Error('Teacher is required');
        if (!subject_id) throw new Error('Subject is required');
        if (!Array.isArray(class_ids) || class_ids.length === 0) throw new Error('At least one class is required');

        const [teacher, subject, school] = await Promise.all([
            prisma.teacher.findFirst({ where: { id: teacher_id, school_id: schoolId, deleted_at: null } }),
            prisma.subject.findFirst({ where: { id: subject_id, school_id: schoolId, deleted_at: null } }),
            prisma.school.findUnique({ where: { id: schoolId }, select: { academic_session: true, current_term: true } }),
        ]);
        if (!teacher) throw new Error('Teacher not found');
        if (!subject) throw new Error('Subject not found');
        if (branchId && branchId !== 'all' && teacher.branch_id !== branchId) throw new Error('Teacher not found');

        const classes = await prisma.class.findMany({ where: { id: { in: class_ids }, school_id: schoolId, deleted_at: null } });
        if (classes.length !== class_ids.length) throw new Error('One or more classes were not found');

        const { session, term } = currentSessionTerm(school as any);

        // Conflict check: for every proposed timetable slot, does this teacher
        // already teach somewhere else at that day/time? Reported up front so
        // the admin can confirm before we create anything.
        const conflicts: any[] = [];
        if (Array.isArray(timetable_slots)) {
            for (const slot of timetable_slots) {
                const result = await TimetableService.checkTeacherConflict(schoolId, {
                    teacherId: teacher_id, day: slot.day, startTime: slot.start_time, endTime: slot.end_time,
                });
                if (result.conflict) conflicts.push({ ...slot, message: result.message });
            }
            if (conflicts.length > 0 && !force) {
                const err: any = new Error('This assignment conflicts with the teacher\'s existing timetable');
                err.requiresConfirmation = true;
                err.conflicts = conflicts;
                throw err;
            }
        }

        const existingActive = await prisma.classTeacher.findMany({
            where: { teacher_id, subject_id, class_id: { in: class_ids }, role: 'subject_teacher', status: 'active', deleted_at: null },
        });
        const alreadyAssignedClassIds = new Set(existingActive.map(e => e.class_id));
        const toCreate = class_ids.filter((id: string) => !alreadyAssignedClassIds.has(id));

        if (toCreate.length === 0) {
            throw new Error(`${teacher.full_name} already teaches ${subject.name} in ${alreadyAssignedClassIds.size > 1 ? 'all selected classes' : 'this class'}`);
        }

        const records = await prisma.$transaction(
            toCreate.map((class_id: string) => {
                const cls = classes.find(c => c.id === class_id)!;
                return prisma.classTeacher.create({
                    data: {
                        school_id: schoolId,
                        branch_id: cls.branch_id ?? teacher.branch_id ?? null,
                        teacher_id, class_id, subject_id,
                        role: 'subject_teacher',
                        session, term,
                        periods_per_week: periods_per_week ?? null,
                        effective_date: effective_date ? new Date(effective_date) : new Date(),
                        status: 'active',
                        created_by: actorId,
                    },
                });
            })
        );

        SocketService.emitToSchool(schoolId, 'teacher:updated', { action: 'subject_teacher_assigned', teacherId: teacher_id, subjectId: subject_id });
        return { created: records, skipped: Array.from(alreadyAssignedClassIds), conflicts };
    }

    /** Ends an assignment (class-teacher or subject-teacher row). Never deletes —
     * the row becomes teaching history. */
    static async removeAssignment(schoolId: string, id: string, actorId: string, branchId?: string) {
        const row = await prisma.classTeacher.findFirst({ where: { id, school_id: schoolId, deleted_at: null } });
        if (!row) throw new Error('Assignment not found');
        if (branchId && branchId !== 'all' && row.branch_id && row.branch_id !== branchId) throw new Error('Assignment not found');
        if (row.status === 'ended') throw new Error('This assignment has already ended');

        const updated = await prisma.classTeacher.update({
            where: { id },
            data: { status: 'ended', ended_at: new Date(), ended_by: actorId },
        });
        SocketService.emitToSchool(schoolId, 'teacher:updated', { action: 'assignment_ended', teacherId: row.teacher_id });
        return updated;
    }

    /** Transfers a Class Teacher assignment to a different class (ends the old
     * row, creates a new one — full history preserved on both). */
    static async transferClassTeacher(schoolId: string, assignmentId: string, newClassId: string, actorId: string, branchId?: string) {
        const row = await prisma.classTeacher.findFirst({ where: { id: assignmentId, school_id: schoolId, role: 'class_teacher', status: 'active', deleted_at: null } });
        if (!row) throw new Error('Active class-teacher assignment not found');

        await prisma.classTeacher.update({
            where: { id: row.id },
            data: { status: 'ended', ended_at: new Date(), ended_by: actorId },
        });
        return this.assignClassTeacher(schoolId, { teacher_id: row.teacher_id, class_id: newClassId, force: true }, actorId, branchId);
    }

    /** All roles + assignments for a teacher's dashboard. */
    static async getTeacherRoles(schoolId: string, teacherId: string) {
        const rows = await prisma.classTeacher.findMany({
            where: { teacher_id: teacherId, school_id: schoolId, status: 'active', deleted_at: null },
            include: {
                class: { select: { id: true, name: true, grade: true, section: true } },
                subject: { select: { id: true, name: true } },
            },
        });

        const classTeacherOf = rows.filter(r => r.role === 'class_teacher').map(r => r.class);
        const subjectAssignments = rows.filter(r => r.role === 'subject_teacher').map(r => ({
            subject: r.subject, class: r.class, periods_per_week: r.periods_per_week,
        }));

        const roles: string[] = [];
        if (classTeacherOf.length > 0) roles.push('class_teacher');
        if (subjectAssignments.length > 0) roles.push('subject_teacher');

        return { roles, class_teacher_of: classTeacherOf, subject_assignments: subjectAssignments };
    }

    /** Workload summary for the admin's "view workload" screen. */
    static async getWorkload(schoolId: string, branchId?: string) {
        const where: any = { school_id: schoolId, status: 'active', deleted_at: null };
        if (branchId && branchId !== 'all') where.branch_id = branchId;

        const [rows, duties, clubs] = await Promise.all([
            prisma.classTeacher.findMany({
                where,
                include: {
                    teacher: { select: { id: true, full_name: true, school_generated_id: true } },
                    class: { select: { name: true } },
                    subject: { select: { name: true } },
                },
            }),
            (prisma as any).teacherDuty.findMany({
                where: { school_id: schoolId, ...(branchId && branchId !== 'all' ? { branch_id: branchId } : {}) },
                select: { teacher_id: true, name: true, weight: true },
            }),
            (prisma as any).extracurricularActivity.findMany({
                where: { school_id: schoolId, advisor_teacher_id: { not: null }, deleted_at: null },
                select: { advisor_teacher_id: true, name: true },
            }),
        ]);

        const byTeacher = new Map<string, any>();
        const getEntry = (teacherId: string, teacher?: { full_name: string; school_generated_id: string | null }) => {
            if (!byTeacher.has(teacherId)) {
                byTeacher.set(teacherId, {
                    teacher_id: teacherId,
                    teacher_name: teacher?.full_name || 'Unknown',
                    teacher_generated_id: teacher?.school_generated_id || null,
                    class_teacher_of: [] as string[],
                    subject_classes: [] as { subject: string; class: string; periods_per_week: number | null }[],
                    duties: [] as string[],
                    clubs: [] as string[],
                    total_periods: 0,
                    duty_weight: 0,
                });
            }
            return byTeacher.get(teacherId);
        };

        for (const r of rows) {
            if (!r.teacher) continue;
            const entry = getEntry(r.teacher_id, r.teacher);
            if (r.role === 'class_teacher') {
                entry.class_teacher_of.push(r.class?.name || 'Unknown');
            } else {
                entry.subject_classes.push({ subject: r.subject?.name || 'Unknown', class: r.class?.name || 'Unknown', periods_per_week: r.periods_per_week });
                entry.total_periods += r.periods_per_week || 0;
            }
        }
        for (const d of duties) {
            const entry = getEntry(d.teacher_id);
            entry.duties.push(d.name);
            entry.duty_weight += d.weight || 1;
        }
        for (const c of clubs) {
            if (!c.advisor_teacher_id) continue;
            const entry = getEntry(c.advisor_teacher_id);
            entry.clubs.push(c.name);
        }

        // Score = teaching periods + (duty weight + club count) * 1 period-equivalent,
        // so a light teaching load with many duties/clubs still reads as "busy."
        const list = Array.from(byTeacher.values()).map(e => ({
            ...e,
            workload_score: e.total_periods + e.duty_weight + e.clubs.length,
        }));
        const avg = list.length ? list.reduce((s, e) => s + e.workload_score, 0) / list.length : 0;
        for (const e of list) {
            e.workload_level = avg === 0 ? 'Balanced'
                : e.workload_score >= avg * 1.4 ? 'High'
                : e.workload_score <= avg * 0.6 ? 'Low'
                : 'Balanced';
        }
        return list;
    }

    static async addDuty(schoolId: string, branchId: string | undefined, data: any) {
        if (!data.teacher_id) throw new Error('A teacher is required');
        if (!data.name?.trim()) throw new Error('A duty name is required');
        return (prisma as any).teacherDuty.create({
            data: {
                school_id: schoolId, branch_id: branchId && branchId !== 'all' ? branchId : null,
                teacher_id: data.teacher_id, name: data.name.trim(), weight: Number(data.weight) || 1,
            },
        });
    }

    static async removeDuty(schoolId: string, id: string) {
        const result = await (prisma as any).teacherDuty.deleteMany({ where: { id, school_id: schoolId } });
        if (result.count === 0) throw new Error('Duty not found');
        return result;
    }

    /** Permanent teaching-history record for a teacher (active + ended rows). */
    static async getTeachingHistory(schoolId: string, teacherId: string) {
        return prisma.classTeacher.findMany({
            where: { teacher_id: teacherId, school_id: schoolId, deleted_at: null },
            include: {
                class: { select: { name: true } },
                subject: { select: { name: true } },
            },
            orderBy: { created_at: 'desc' },
        });
    }

    /** List active assignments for the admin screen, optionally filtered by role/class/teacher. */
    static async listAssignments(schoolId: string, branchId: string | undefined, filters: { role?: string; classId?: string; teacherId?: string }) {
        const where: any = { school_id: schoolId, status: 'active', deleted_at: null };
        if (branchId && branchId !== 'all') where.branch_id = branchId;
        if (filters.role) where.role = filters.role;
        if (filters.classId) where.class_id = filters.classId;
        if (filters.teacherId) where.teacher_id = filters.teacherId;

        return prisma.classTeacher.findMany({
            where,
            include: {
                teacher: { select: { id: true, full_name: true, school_generated_id: true, avatar_url: true } },
                class: { select: { id: true, name: true, grade: true, section: true } },
                subject: { select: { id: true, name: true } },
            },
            orderBy: { created_at: 'desc' },
        });
    }

    /** Is this teacher the (an) active Class Teacher of this class? Used to gate
     * score-entry / class-management permissions elsewhere. */
    static async isClassTeacherOf(teacherId: string, classId: string): Promise<boolean> {
        const row = await prisma.classTeacher.findFirst({
            where: { teacher_id: teacherId, class_id: classId, role: 'class_teacher', status: 'active', deleted_at: null },
        });
        return !!row;
    }

    /** Is this teacher an active Subject Teacher of this subject in this class?
     * Used to gate result/score entry to the assigned subject teacher only. */
    static async isSubjectTeacherOf(teacherId: string, classId: string, subjectId: string): Promise<boolean> {
        const row = await prisma.classTeacher.findFirst({
            where: { teacher_id: teacherId, class_id: classId, subject_id: subjectId, role: 'subject_teacher', status: 'active', deleted_at: null },
        });
        return !!row;
    }

    /**
     * Everything the "My Class" hub needs in one authorized call: roster with
     * parent contacts, behavior notes, class academic average, medical
     * alerts, the class's own full timetable, and today's QR lesson
     * monitoring for this class. Only the class's active Class Teacher may
     * call this — enforced here rather than trusting the frontend.
     */
    static async getMyClassHub(schoolId: string, teacherId: string, classId: string) {
        const isClassTeacher = await this.isClassTeacherOf(teacherId, classId);
        if (!isClassTeacher) throw new Error('You are not the assigned Class Teacher of this class');

        const cls = await prisma.class.findFirst({ where: { id: classId, school_id: schoolId, deleted_at: null } });
        if (!cls) throw new Error('Class not found');

        const enrollments = await prisma.studentEnrollment.findMany({
            where: { class_id: classId, status: 'Active', deleted_at: null },
            include: {
                student: {
                    select: {
                        id: true, full_name: true, school_generated_id: true, avatar_url: true, admission_number: true,
                        parents: { include: { parent: { select: { full_name: true, phone: true, email: true, relationship: true } } } },
                    },
                },
            },
        });
        const studentIds = enrollments.map(e => e.student_id);

        const [behaviorNotes, academicPerf, healthIncidents, timetable, lessonReport] = await Promise.all([
            prisma.behaviorNote.findMany({
                where: { student_id: { in: studentIds }, school_id: schoolId, deleted_at: null },
                orderBy: { date: 'desc' }, take: 30,
                include: { student: { select: { full_name: true } } },
            }),
            prisma.academicPerformance.findMany({ where: { student_id: { in: studentIds }, school_id: schoolId, deleted_at: null } }),
            prisma.healthIncident.findMany({
                where: { student_id: { in: studentIds }, school_id: schoolId, deleted_at: null, status: { not: 'resolved' } },
                orderBy: { incident_date: 'desc' },
                include: { student: { select: { full_name: true } } },
            }),
            prisma.timetable.findMany({
                where: { class_id: classId, school_id: schoolId, status: 'Published', deleted_at: null },
                include: { teacher: { select: { full_name: true } } },
                orderBy: { start_time: 'asc' },
            }),
            (prisma as any).lessonAttendance?.findMany({
                where: { school_id: schoolId, class_name: cls.name, deleted_at: null },
                orderBy: { date: 'desc' }, take: 20,
            }).catch(() => []) ?? [],
        ]);

        const classAverage = academicPerf.length > 0
            ? Math.round(academicPerf.reduce((sum, r) => sum + r.score, 0) / academicPerf.length)
            : null;

        return {
            class: { id: cls.id, name: cls.name, grade: cls.grade, section: cls.section },
            roster: enrollments.map(e => ({
                id: e.student.id,
                full_name: e.student.full_name,
                school_generated_id: e.student.school_generated_id,
                avatar_url: e.student.avatar_url,
                admission_number: e.student.admission_number,
                parents: e.student.parents.map(p => p.parent),
            })),
            behavior_notes: behaviorNotes,
            academic_summary: { average: classAverage, records: academicPerf.length },
            medical_alerts: healthIncidents,
            timetable,
            lesson_monitoring: lessonReport,
        };
    }
}
