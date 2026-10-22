import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../../src/config/database';
import { ClassService } from '../../src/services/class.service';
import { StudentService } from '../../src/services/student.service';

// Academic Levels → Edit Class: add/remove a subject on the arms the admin picks.
const S = 'csa-school', S2 = 'csa-school-2';
const B1 = 'csa-main', B2 = 'csa-br2', X1 = 'csa-x-main';

const ids: Record<string, string> = {};
let adminUserId: string;

async function cleanup() {
    for (const sid of [S, S2]) {
        await prisma.auditLog.deleteMany({ where: { school_id: sid } }).catch(() => {});
        await prisma.reportCard.deleteMany({ where: { school_id: sid } }).catch(() => {});
        await prisma.academicPerformance.deleteMany({ where: { school_id: sid } }).catch(() => {});
        await prisma.studentEnrollment.deleteMany({ where: { school_id: sid } }).catch(() => {});
        await prisma.student.deleteMany({ where: { school_id: sid } }).catch(() => {});
        await prisma.user.deleteMany({ where: { school_id: sid } }).catch(() => {});
        await prisma.class.deleteMany({ where: { school_id: sid } }).catch(() => {});
        await prisma.subject.deleteMany({ where: { school_id: sid } }).catch(() => {});
        await prisma.branch.deleteMany({ where: { school_id: sid } }).catch(() => {});
        await prisma.school.delete({ where: { id: sid } }).catch(() => {});
    }
}

async function mkStudent(key: string, classId: string, branch: string, assigned: string[]) {
    const u = await prisma.user.create({ data: {
        email: `${key}@csa.test.local`, password_hash: 'x', full_name: key, role: 'STUDENT' as any, school_id: S, branch_id: branch,
    } });
    const st = await prisma.student.create({ data: {
        user_id: u.id, school_id: S, branch_id: branch, full_name: key, grade: 10, section: 'A', assigned_subjects: assigned,
    } as any });
    await prisma.studentEnrollment.create({ data: { student_id: st.id, class_id: classId, school_id: S, branch_id: branch, status: 'Active', is_primary: true } });
    ids[key] = st.id;
}

const names = async (studentId: string) => (await StudentService.getMySubjects(S, studentId)).map((s: any) => s.name).sort();
const classSubs = async (classId: string) => (await ClassService.getClassSubjectsById(S, classId)).map((s: any) => s.name).sort();
const assigned = async (key: string) => ((await prisma.student.findUnique({ where: { id: ids[key] } })) as any).assigned_subjects;

describe('Class subject add/remove per arm', () => {
    beforeAll(async () => {
        await cleanup();
        await prisma.school.create({ data: { id: S, name: 'CSA', code: 'CSA', slug: S, plan_type: 'enterprise', subscription_status: 'active' } });
        await prisma.school.create({ data: { id: S2, name: 'CSA2', code: 'CSB', slug: S2, plan_type: 'enterprise', subscription_status: 'active' } });
        await prisma.branch.create({ data: { id: B1, school_id: S, name: 'Main', code: 'MAIN', is_main: true } });
        await prisma.branch.create({ data: { id: B2, school_id: S, name: 'Second', code: 'BR2' } });
        await prisma.branch.create({ data: { id: X1, school_id: S2, name: 'Main', code: 'MAIN', is_main: true } });
        const admin = await prisma.user.create({ data: { email: 'admin@csa.test.local', password_hash: 'x', full_name: 'Admin', role: 'ADMIN' as any, school_id: S, branch_id: B1 } });
        adminUserId = admin.id;

        const english = await prisma.subject.create({ data: { school_id: S, branch_id: B1, name: 'English' } });
        ids.english = english.id;
        for (const [k, sec, br] of [['A', 'A', B1], ['B', 'B', B1], ['C', 'C', B2]] as const) {
            const c = await prisma.class.create({ data: { school_id: S, branch_id: br, name: `SSS 1 ${sec}`, grade: 10, section: sec, subjects: { connect: [{ id: english.id }] } } });
            ids[k] = c.id;
        }
        const jss = await prisma.class.create({ data: { school_id: S, branch_id: B1, name: 'JSS 1 A', grade: 7, section: 'A' } });
        ids.jss = jss.id;
        const foreign = await prisma.class.create({ data: { school_id: S2, branch_id: X1, name: 'SSS 1 A', grade: 10, section: 'A' } });
        ids.foreign = foreign.id;

        await mkStudent('inheritA', ids.A, B1, []);
        await mkStudent('customA', ids.A, B1, ['English', 'Economics']);
        await mkStudent('inheritB', ids.B, B1, []);
        await mkStudent('customB', ids.B, B1, ['English']);
    }, 180000);

    afterAll(cleanup, 180000);

    const scope = (branchId?: string) => ({ schoolId: S, branchId, userId: adminUserId });

    it('adds to ONE arm only: SSS 1 A gets it, SSS 1 B does not; inheriting student sees it, custom list untouched', async () => {
        const impact = await ClassService.getSubjectAddImpact(S, B1, ids.A, [ids.A], 'Biology');
        expect(impact.customCount).toBe(1);
        expect(impact.inheritCount).toBe(1);

        const r = await ClassService.addSubjectToClasses(scope(B1), ids.A, { name: 'Biology', classIds: [ids.A], addToCustom: false });
        expect(r.customUpdated).toBe(0);
        expect(await classSubs(ids.A)).toEqual(['Biology', 'English']);
        expect(await classSubs(ids.B)).toEqual(['English']);
        expect(await names(ids.inheritA)).toEqual(['Biology', 'English']);
        expect(await assigned('customA')).toEqual(['English', 'Economics']);
        expect(await names(ids.inheritB)).toEqual(['English']);
    });

    it('adds to ALL selected arms and, when the admin says yes, appends to custom lists keeping other choices', async () => {
        const impact = await ClassService.getSubjectAddImpact(S, B1, ids.A, [ids.A, ids.B], 'Chemistry');
        expect(impact.customCount).toBe(2);
        const r = await ClassService.addSubjectToClasses(scope(B1), ids.A, { name: 'Chemistry', classIds: [ids.A, ids.B], addToCustom: true });
        expect(r.customUpdated).toBe(2);
        expect(await classSubs(ids.B)).toEqual(['Chemistry', 'English']);
        expect(await assigned('customA')).toEqual(['English', 'Economics', 'Chemistry']);
        expect(await assigned('customB')).toEqual(['English', 'Chemistry']);
        expect(await names(ids.inheritB)).toEqual(['Chemistry', 'English']);
        // Reuses the existing subject row instead of creating a duplicate
        await ClassService.addSubjectToClasses(scope(B1), ids.B, { name: 'chemistry', classIds: [ids.B] });
        expect(await prisma.subject.count({ where: { school_id: S, name: { equals: 'chemistry', mode: 'insensitive' } } })).toBe(1);
        // Audit trail
        const logs = await prisma.auditLog.findMany({ where: { school_id: S, action: 'class.subject.add' } });
        expect(logs.length).toBeGreaterThanOrEqual(2);
    });

    it('removing a subject unlinks it and strips it from custom lists but KEEPS past results', async () => {
        const chem = await prisma.subject.findFirst({ where: { school_id: S, name: 'Chemistry' } });
        await prisma.academicPerformance.create({ data: { student_id: ids.customA, school_id: S, branch_id: B1, subject: 'Chemistry', score: 78, term: 'First', session: '2025/2026' } });
        await prisma.reportCard.create({ data: { school_id: S, branch_id: B1, student_id: ids.customA, session: '2025/2026', term: 'First', academic_records: [{ subject: 'Chemistry', total: 78 }] as any } as any });

        const r = await ClassService.removeSubjectFromClasses(scope(B1), ids.A, chem!.id, [ids.A, ids.B]);
        expect(r.studentsUpdated).toBe(2);
        expect(await classSubs(ids.A)).toEqual(['Biology', 'English']);
        expect(await classSubs(ids.B)).toEqual(['English']);
        expect(await assigned('customA')).toEqual(['English', 'Economics']);
        expect(await assigned('customB')).toEqual(['English']);

        // Subject row, scores and report-card rows are all still there
        expect(await prisma.subject.findUnique({ where: { id: chem!.id } })).toBeTruthy();
        expect(await prisma.academicPerformance.count({ where: { school_id: S, subject: 'Chemistry' } })).toBe(1);
        const rc = await prisma.reportCard.findFirst({ where: { school_id: S, student_id: ids.customA } });
        expect((rc as any).academic_records).toEqual([{ subject: 'Chemistry', total: 78 }]);
        expect(await prisma.auditLog.count({ where: { school_id: S, action: 'class.subject.remove' } })).toBe(1);
    });

    it('a branch admin cannot touch another branch\'s arm; the main admin (all branches) can', async () => {
        await expect(ClassService.addSubjectToClasses(scope(B1), ids.A, { name: 'Physics', classIds: [ids.A, ids.C] })).rejects.toThrow(/not found/);
        await expect(ClassService.addSubjectToClasses(scope(B1), ids.C, { name: 'Physics' })).rejects.toThrow(/not found/);
        expect(await classSubs(ids.A)).not.toContain('Physics');

        await ClassService.addSubjectToClasses(scope(undefined), ids.A, { name: 'Physics', classIds: [ids.A, ids.C] });
        expect(await classSubs(ids.C)).toContain('Physics');
    });

    it('arms must be the same level, and another school\'s class or subject is refused', async () => {
        await expect(ClassService.addSubjectToClasses(scope(B1), ids.A, { name: 'Music', classIds: [ids.A, ids.jss] })).rejects.toThrow(/not found/);
        await expect(ClassService.addSubjectToClasses(scope(undefined), ids.A, { name: 'Music', classIds: [ids.A, ids.foreign] })).rejects.toThrow(/not found/);
        await expect(ClassService.addSubjectToClasses({ schoolId: S2, branchId: undefined, userId: null }, ids.A, { name: 'Music' })).rejects.toThrow(/not found/);
        const foreignSub = await prisma.subject.create({ data: { school_id: S2, branch_id: X1, name: 'Foreign Art' } });
        await expect(ClassService.addSubjectToClasses(scope(B1), ids.A, { subjectId: foreignSub.id })).rejects.toThrow(/not found/);
        await expect(ClassService.removeSubjectFromClasses(scope(B1), ids.A, foreignSub.id)).rejects.toThrow(/not found/);
        expect(await prisma.subject.count({ where: { school_id: S, name: 'Music' } })).toBe(0);
    });

    it('is atomic: a failure late in the action rolls back the class links, new subject and custom lists', async () => {
        // A user id that does not exist makes the final audit write fail (FK),
        // after every class link and student update has already run.
        await expect(ClassService.addSubjectToClasses({ schoolId: S, branchId: B1, userId: 'no-such-user' }, ids.A, { name: 'Geography', classIds: [ids.A, ids.B], addToCustom: true })).rejects.toThrow();
        expect(await prisma.subject.count({ where: { school_id: S, name: 'Geography' } })).toBe(0);
        expect(await classSubs(ids.A)).not.toContain('Geography');
        expect(await assigned('customA')).toEqual(['English', 'Economics']);

        const english = ids.english;
        await expect(ClassService.removeSubjectFromClasses({ schoolId: S, branchId: B1, userId: 'no-such-user' }, ids.A, english, [ids.A, ids.B])).rejects.toThrow();
        expect(await classSubs(ids.A)).toContain('English');
        expect(await assigned('customB')).toEqual(['English']);
    });
});
