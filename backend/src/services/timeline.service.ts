import prisma from '../config/database';

/** Auto-logged events are synthesized at read time from data that already
 * exists (Student/Teacher creation date, exit fields, suspensions,
 * achievements) rather than written via hooks into other features' flows —
 * safer than threading write-hooks through signup, promotion, and exit
 * transactions, and always correct since it reads the source of truth
 * directly. Only custom entries (e.g. "made prefect") are stored rows. */
export class TimelineService {
    static async getStudentTimeline(schoolId: string, studentId: string) {
        const student = await prisma.student.findFirst({
            where: { id: studentId, school_id: schoolId, deleted_at: null },
            select: { id: true, full_name: true, created_at: true, status: true, exit_year: true, exit_class: true, exit_date: true, withdrawal_reason: true },
        });
        if (!student) throw new Error('Student not found');

        const events: any[] = [];

        events.push({
            id: `auto-admission-${student.id}`, event_type: 'Admission', title: 'Admitted',
            description: null, event_date: student.created_at, source: 'auto',
        });

        if (['Graduated', 'Transferred', 'Withdrawn'].includes(student.status) && student.exit_date) {
            const labels: Record<string, string> = { Graduated: 'Graduated', Transferred: 'Transferred', Withdrawn: 'Withdrawn' };
            events.push({
                id: `auto-exit-${student.id}`, event_type: student.status, title: labels[student.status],
                description: student.exit_class ? `From ${student.exit_class}` : student.withdrawal_reason || null,
                event_date: student.exit_date, source: 'auto',
            });
        }

        const [suspensions, achievements, manual] = await Promise.all([
            prisma.studentSuspension.findMany({ where: { student_id: studentId, deleted_at: null }, select: { id: true, reason: true, start_date: true } }),
            prisma.achievement.findMany({ where: { student_id: studentId, deleted_at: null }, select: { id: true, title: true, description: true, date: true, type: true, icon: true, color: true } }),
            (prisma as any).lifeEvent.findMany({ where: { school_id: schoolId, subject_type: 'student', subject_id: studentId }, orderBy: { event_date: 'desc' } }),
        ]);

        for (const s of suspensions) {
            events.push({ id: `auto-suspension-${s.id}`, event_type: 'Suspension', title: 'Suspended', description: s.reason, event_date: new Date(s.start_date), source: 'auto' });
        }
        for (const a of achievements) {
            events.push({ id: `auto-achievement-${a.id}`, event_type: 'Achievement', title: a.title, description: a.description, event_date: a.date, icon: a.icon, color: a.color, source: 'auto' });
        }
        for (const m of manual) {
            events.push({ id: m.id, event_type: m.event_type, title: m.title, description: m.description, event_date: m.event_date, icon: m.icon, color: m.color, source: 'manual' });
        }

        events.sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());
        return events;
    }

    static async getTeacherTimeline(schoolId: string, teacherId: string) {
        const teacher = await prisma.teacher.findFirst({
            where: { id: teacherId, school_id: schoolId, deleted_at: null },
            select: { id: true, full_name: true, created_at: true, status: true },
        });
        if (!teacher) throw new Error('Teacher not found');

        const events: any[] = [{
            id: `auto-hired-${teacher.id}`, event_type: 'Hired', title: 'Joined the school',
            description: null, event_date: teacher.created_at, source: 'auto',
        }];

        const manual = await (prisma as any).lifeEvent.findMany({ where: { school_id: schoolId, subject_type: 'teacher', subject_id: teacherId }, orderBy: { event_date: 'desc' } });
        for (const m of manual) {
            events.push({ id: m.id, event_type: m.event_type, title: m.title, description: m.description, event_date: m.event_date, icon: m.icon, color: m.color, source: 'manual' });
        }

        events.sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());
        return events;
    }

    static async addManualEvent(schoolId: string, branchId: string | undefined, data: any, actorId: string) {
        if (!['student', 'teacher'].includes(data.subject_type)) throw new Error('subject_type must be student or teacher');
        if (!data.subject_id) throw new Error('subject_id is required');
        if (!data.title?.trim()) throw new Error('A title is required');
        if (!data.event_date) throw new Error('An event date is required');

        if (data.subject_type === 'student') {
            const exists = await prisma.student.findFirst({ where: { id: data.subject_id, school_id: schoolId, deleted_at: null }, select: { id: true } });
            if (!exists) throw new Error('Student not found');
        } else {
            const exists = await prisma.teacher.findFirst({ where: { id: data.subject_id, school_id: schoolId, deleted_at: null }, select: { id: true } });
            if (!exists) throw new Error('Teacher not found');
        }

        return (prisma as any).lifeEvent.create({
            data: {
                school_id: schoolId, branch_id: branchId && branchId !== 'all' ? branchId : null,
                subject_type: data.subject_type, subject_id: data.subject_id,
                event_type: data.event_type || 'Custom', title: data.title.trim(), description: data.description?.trim() || null,
                event_date: new Date(data.event_date), icon: data.icon || null, color: data.color || null,
                source: 'manual', created_by: actorId,
            },
        });
    }

    static async deleteManualEvent(schoolId: string, eventId: string) {
        const event = await (prisma as any).lifeEvent.findFirst({ where: { id: eventId, school_id: schoolId } });
        if (!event) throw new Error('Timeline entry not found');
        if (event.source !== 'manual') throw new Error('Only manually added entries can be removed');
        return (prisma as any).lifeEvent.delete({ where: { id: eventId } });
    }
}
