import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../../src/config/database';
import { ClassService } from '../../src/services/class.service';
import { StudentService } from '../../src/services/student.service';
import { SubjectService } from '../../src/services/subject.service';

const S = 'cls-subj-school', B = 'cls-subj-main';

let classId: string;
let studentId: string;

async function cleanup() {
    await prisma.classTeacher.deleteMany({ where: { school_id: S } }).catch(() => {});
    await prisma.teacher.deleteMany({ where: { school_id: S } }).catch(() => {});
    await prisma.studentEnrollment.deleteMany({ where: { school_id: S } }).catch(() => {});
    await prisma.student.deleteMany({ where: { school_id: S } }).catch(() => {});
    await prisma.user.deleteMany({ where: { school_id: S } }).catch(() => {});
    await prisma.class.deleteMany({ where: { school_id: S } }).catch(() => {});
    await prisma.subject.deleteMany({ where: { school_id: S } }).catch(() => {});
    await prisma.branch.deleteMany({ where: { school_id: S } }).catch(() => {});
    await prisma.school.delete({ where: { id: S } }).catch(() => {});
}

describe('Class subject assignment → gradebook + student inheritance', () => {
    beforeAll(async () => {
        await cleanup();
        await prisma.school.create({ data: { id: S, name: 'CS', code: 'CS', slug: S, plan_type: 'enterprise', subscription_status: 'active' } });
        await prisma.branch.create({ data: { id: B, school_id: S, name: 'Main', code: 'MAIN', is_main: true } });
        // A stray school subject that is NOT assigned to the class — the old
        // fallback used to leak subjects like this into every student's list.
        await prisma.subject.create({ data: { school_id: S, branch_id: B, name: 'Stray Subject' } });
    }, 120000);

    afterAll(cleanup, 120000);

    it('createClass with subjects[] creates Subject rows and links them', async () => {
        const created: any = await ClassService.createClass(S, B, {
            name: 'SSS 1', grade: 10, section: 'A',
            subjects: ['Mathematics', 'English Language'],
        });
        classId = created.id;
        expect(created.subjects.map((s: any) => s.name).sort()).toEqual(['English Language', 'Mathematics']);

        const subjectRows = await prisma.subject.findMany({ where: { school_id: S, name: { in: ['Mathematics', 'English Language'] } } });
        expect(subjectRows).toHaveLength(2);
    });

    it('updateClass with subjects[] REPLACES the class subject links', async () => {
        const updated: any = await ClassService.updateClass(S, B, classId, {
            subjects: ['Mathematics', 'Biology'],
        });
        expect(updated.subjects.map((s: any) => s.name).sort()).toEqual(['Biology', 'Mathematics']);
    });

    it('updateClass WITHOUT subjects leaves the links untouched', async () => {
        await ClassService.updateClass(S, B, classId, { section: 'B' });
        const subs = await ClassService.getClassSubjectsById(S, classId);
        expect(subs.map((s: any) => s.name).sort()).toEqual(['Biology', 'Mathematics']);
    });

    it('getClasses includes each class\'s assigned subjects', async () => {
        const classes: any[] = await ClassService.getClasses(S, B);
        const cls = classes.find(c => c.id === classId);
        expect(cls).toBeTruthy();
        expect((cls.subjects || []).map((s: any) => s.name).sort()).toEqual(['Biology', 'Mathematics']);
    });

    it('an enrolled student with NO per-student subjects inherits exactly the class subjects', async () => {
        const user = await prisma.user.create({ data: {
            email: 'cls-subj-student@test.local', password_hash: 'x', full_name: 'CS Student',
            role: 'STUDENT' as any, school_id: S, branch_id: B,
        }});
        const student = await prisma.student.create({ data: {
            user_id: user.id, school_id: S, branch_id: B, full_name: 'CS Student', grade: 10, section: 'B',
        }});
        studentId = student.id;
        await prisma.studentEnrollment.create({ data: {
            student_id: studentId, class_id: classId, school_id: S, branch_id: B, status: 'Active', is_primary: true,
        }});

        const subs: any[] = await StudentService.getMySubjects(S, studentId);
        const names = subs.map(s => s.name).sort();
        // Class subjects only — NOT 'Stray Subject' from the school-wide fallback
        expect(names).toEqual(['Biology', 'Mathematics']);
    });

    it('a per-student subject selection overrides the class subjects everywhere', async () => {
        await prisma.student.update({
            where: { id: studentId },
            data: { assigned_subjects: ['Economics', 'Mathematics'] } as any,
        });
        const subs: any[] = await StudentService.getMySubjects(S, studentId);
        expect(subs.map(s => s.name).sort()).toEqual(['Economics', 'Mathematics']);
    });

    it('deleting a subject removes it everywhere: subject list, class links, teacher assignments', async () => {
        // Biology is linked to the class; also point a ClassTeacher row at it
        const biology = await prisma.subject.findFirst({ where: { school_id: S, name: 'Biology' } });
        expect(biology).toBeTruthy();

        const tUser = await prisma.user.create({ data: {
            email: 'cls-subj-teacher@test.local', password_hash: 'x', full_name: 'CS Teacher',
            role: 'TEACHER' as any, school_id: S, branch_id: B,
        }});
        const teacher = await prisma.teacher.create({ data: {
            user_id: tUser.id, school_id: S, branch_id: B, full_name: 'CS Teacher',
        }});
        const ct = await prisma.classTeacher.create({ data: {
            school_id: S, branch_id: B, class_id: classId, teacher_id: teacher.id, subject_id: biology!.id,
        }});

        await SubjectService.deleteSubject(S, biology!.id);

        // Gone from the school's subject list
        const schoolSubjects: any[] = await SubjectService.getSubjects(S, B);
        expect(schoolSubjects.map(s => s.name)).not.toContain('Biology');

        // Detached from the class
        const clsSubs = await ClassService.getClassSubjectsById(S, classId);
        expect(clsSubs.map((s: any) => s.name)).not.toContain('Biology');

        // Teacher assignment survives with the subject cleared — not deleted
        const ctAfter = await prisma.classTeacher.findUnique({ where: { id: ct.id } });
        expect(ctAfter).toBeTruthy();
        expect(ctAfter!.subject_id).toBeNull();

        // Tenant guard: deleting an unknown/foreign subject throws
        await expect(SubjectService.deleteSubject(S, 'not-a-real-subject')).rejects.toThrow('Subject not found');
    });
});
