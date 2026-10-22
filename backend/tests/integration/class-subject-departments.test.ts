import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma, { withTenantTransaction } from '../../src/config/database';
import { ClassService } from '../../src/services/class.service';
import { StudentService } from '../../src/services/student.service';
import { getAssignments } from '../../src/controllers/assignment.controller';

// A class subject can be limited to one department (ClassSubjectDepartment):
// only students whose Student.department matches get it.
const S = 'csd-school', S2 = 'csd-school-2';
const B = 'csd-main', X = 'csd-x-main';
const ids: Record<string, string> = {};
const users: Record<string, string> = {};
let adminUserId: string;

async function cleanup() {
    for (const sid of [S, S2]) {
        await prisma.auditLog.deleteMany({ where: { school_id: sid } }).catch(() => {});
        await prisma.assignment.deleteMany({ where: { school_id: sid } }).catch(() => {});
        await prisma.classSubjectDepartment.deleteMany({ where: { school_id: sid } }).catch(() => {});
        await prisma.studentEnrollment.deleteMany({ where: { school_id: sid } }).catch(() => {});
        await prisma.student.deleteMany({ where: { school_id: sid } }).catch(() => {});
        await prisma.user.deleteMany({ where: { school_id: sid } }).catch(() => {});
        await prisma.class.deleteMany({ where: { school_id: sid } }).catch(() => {});
        await prisma.subject.deleteMany({ where: { school_id: sid } }).catch(() => {});
        await prisma.branch.deleteMany({ where: { school_id: sid } }).catch(() => {});
        await prisma.school.delete({ where: { id: sid } }).catch(() => {});
    }
}

async function mkStudent(key: string, classId: string, department: string | null, assigned: string[]) {
    const u = await prisma.user.create({ data: { email: `${key}@csd.test.local`, password_hash: 'x', full_name: key, role: 'STUDENT' as any, school_id: S, branch_id: B } });
    const st = await prisma.student.create({ data: { user_id: u.id, school_id: S, branch_id: B, full_name: key, grade: 10, section: 'A', department, assigned_subjects: assigned } as any });
    await prisma.studentEnrollment.create({ data: { student_id: st.id, class_id: classId, school_id: S, branch_id: B, status: 'Active', is_primary: true } });
    ids[key] = st.id; users[key] = u.id;
}

const mySubjects = async (key: string) => (await StudentService.getMySubjects(S, ids[key])).map((s: any) => s.name).sort();
const assigned = async (key: string) => ((await prisma.student.findUnique({ where: { id: ids[key] } })) as any).assigned_subjects;
const scope = (branchId?: string) => ({ schoolId: S, branchId, userId: adminUserId });

async function assignmentsFor(key: string) {
    let body: any = null;
    const res: any = { status: () => res, json: (b: any) => { body = b; return res; } };
    await getAssignments({ user: { id: users[key], role: 'STUDENT', school_id: S, branch_id: B }, query: {} } as any, res);
    return (body || []).map((a: any) => a.title).sort();
}

describe('Department-limited class subjects', () => {
    beforeAll(async () => {
        await cleanup();
        await prisma.school.create({ data: { id: S, name: 'CSD', code: 'CSD', slug: S, plan_type: 'enterprise', subscription_status: 'active' } });
        await prisma.school.create({ data: { id: S2, name: 'CSD2', code: 'CSE', slug: S2, plan_type: 'enterprise', subscription_status: 'active' } });
        await prisma.branch.create({ data: { id: B, school_id: S, name: 'Main', code: 'MAIN', is_main: true } });
        await prisma.branch.create({ data: { id: X, school_id: S2, name: 'Main', code: 'MAIN', is_main: true } });
        adminUserId = (await prisma.user.create({ data: { email: 'admin@csd.test.local', password_hash: 'x', full_name: 'Admin', role: 'ADMIN' as any, school_id: S, branch_id: B } })).id;
        const english = await prisma.subject.create({ data: { school_id: S, branch_id: B, name: 'English' } });
        ids.A = (await prisma.class.create({ data: { school_id: S, branch_id: B, name: 'SSS 1 A', grade: 10, section: 'A', subjects: { connect: [{ id: english.id }] } } })).id;
        ids.Bc = (await prisma.class.create({ data: { school_id: S, branch_id: B, name: 'SSS 1 B', grade: 10, section: 'B', department: 'Commercial', subjects: { connect: [{ id: english.id }] } } })).id;
        ids.foreign = (await prisma.class.create({ data: { school_id: S2, branch_id: X, name: 'SSS 1 A', grade: 10, section: 'A' } })).id;

        await mkStudent('sci', ids.A, ' science ', []);          // trimmed / case-insensitive match
        await mkStudent('arts', ids.A, 'Arts', []);
        await mkStudent('none', ids.A, null, []);
        await mkStudent('sciCustom', ids.A, 'Science', ['English']);
        await mkStudent('artsCustom', ids.A, 'Arts', ['English']);

        await prisma.assignment.create({ data: { school_id: S, branch_id: B, class_id: ids.A, title: 'Lab report', subject: 'Physics', due_date: new Date(Date.now() + 86400000), is_published: true } as any });
        await prisma.assignment.create({ data: { school_id: S, branch_id: B, class_id: ids.A, title: 'Essay', subject: 'English', due_date: new Date(Date.now() + 86400000), is_published: true } as any });
    }, 180000);

    afterAll(cleanup, 180000);

    it('lists the departments in use at the level (arms + students), case-merged', async () => {
        expect((await ClassService.getLevelDepartments(S, B, ids.A)).map(d => d.toLowerCase())).toEqual(['arts', 'commercial', 'science']);
    });

    it('a Science subject reaches only Science students; the custom-list prompt counts only Science', async () => {
        const impact = await ClassService.getSubjectAddImpact(S, B, ids.A, [ids.A], 'Physics', 'Science');
        expect(impact.customCount).toBe(1);   // sciCustom only, not artsCustom
        expect(impact.inheritCount).toBe(1);  // sci only

        const r = await ClassService.addSubjectToClasses(scope(B), ids.A, { name: 'Physics', classIds: [ids.A], addToCustom: true, department: 'Science' });
        expect(r.customUpdated).toBe(1);
        expect(r.department).toBe('Science');

        expect(await mySubjects('sci')).toEqual(['English', 'Physics']);
        expect(await mySubjects('arts')).toEqual(['English']);
        expect(await mySubjects('none')).toEqual(['English']);
        expect(await assigned('sciCustom')).toEqual(['English', 'Physics']);
        expect(await assigned('artsCustom')).toEqual(['English']);

        const subs: any[] = await ClassService.getClassSubjectsById(S, ids.A);
        expect(subs.find(s => s.name === 'Physics').department).toBe('Science');
        expect(subs.find(s => s.name === 'English').department).toBeNull();
        const listed: any[] = await ClassService.getClasses(S, B);
        expect(listed.find(c => c.id === ids.A).subjects.find((s: any) => s.name === 'Physics').department).toBe('Science');
    });

    it('assignments for a department subject are hidden from other departments', async () => {
        expect(await assignmentsFor('sci')).toEqual(['Essay', 'Lab report']);
        expect(await assignmentsFor('arts')).toEqual(['Essay']);
    });

    it('re-adding for "All departments" lifts the limit; removing deletes the department row', async () => {
        const physics = await prisma.subject.findFirst({ where: { school_id: S, name: 'Physics' } });
        await ClassService.addSubjectToClasses(scope(B), ids.A, { subjectId: physics!.id, classIds: [ids.A], department: 'all' });
        expect(await prisma.classSubjectDepartment.count({ where: { school_id: S } })).toBe(0);
        expect(await mySubjects('arts')).toEqual(['English', 'Physics']);

        await ClassService.addSubjectToClasses(scope(B), ids.A, { subjectId: physics!.id, classIds: [ids.A], department: 'Science' });
        expect(await prisma.classSubjectDepartment.count({ where: { school_id: S } })).toBe(1);
        await ClassService.removeSubjectFromClasses(scope(B), ids.A, physics!.id, [ids.A]);
        expect(await prisma.classSubjectDepartment.count({ where: { school_id: S } })).toBe(0);
        expect(await mySubjects('sci')).toEqual(['English']);
    });

    it('a student whose class subjects are all for another department gets none (no grade-level fallback)', async () => {
        const lit = await prisma.subject.create({ data: { school_id: S, branch_id: B, name: 'Literature' } });
        const onlyArts = await prisma.class.create({ data: { school_id: S, branch_id: B, name: 'SSS 1 C', grade: 10, section: 'C', subjects: { connect: [{ id: lit.id }] } } });
        await prisma.classSubjectDepartment.create({ data: { school_id: S, branch_id: B, class_id: onlyArts.id, subject_id: lit.id, department: 'Arts' } });
        await mkStudent('sciInC', onlyArts.id, 'Science', []);
        expect(await mySubjects('sciInC')).toEqual([]);
    });

    it('another school cannot use the department path', async () => {
        await expect(ClassService.getLevelDepartments(S2, undefined, ids.A)).rejects.toThrow(/not found/);
        await expect(ClassService.addSubjectToClasses({ schoolId: S2, branchId: undefined, userId: null }, ids.A, { name: 'Physics', department: 'Science' })).rejects.toThrow(/not found/);
    });

    it('RLS: department rows are invisible to, and cannot be written from, another school', async () => {
        const eng = await prisma.subject.findFirst({ where: { school_id: S, name: 'English' } });
        await prisma.classSubjectDepartment.create({ data: { school_id: S, branch_id: B, class_id: ids.A, subject_id: eng!.id, department: 'Arts' } });

        const seenByOther = await withTenantTransaction({ schoolId: S2 }, tx => tx.classSubjectDepartment.findMany({ where: { class_id: ids.A } }));
        expect(seenByOther).toHaveLength(0);
        const seenByOwner = await withTenantTransaction({ schoolId: S }, tx => tx.classSubjectDepartment.findMany({ where: { class_id: ids.A } }));
        expect(seenByOwner).toHaveLength(1);

        await expect(withTenantTransaction({ schoolId: S2 }, tx => tx.classSubjectDepartment.create({
            data: { school_id: S, branch_id: B, class_id: ids.Bc, subject_id: eng!.id, department: 'Science' }
        }))).rejects.toThrow();
        await expect(withTenantTransaction({ schoolId: S2 }, tx => tx.classSubjectDepartment.updateMany({
            where: { class_id: ids.A }, data: { department: 'Hacked' }
        }))).resolves.toMatchObject({ count: 0 });
        expect((await prisma.classSubjectDepartment.findFirst({ where: { class_id: ids.A } }))!.department).toBe('Arts');
    });
});
