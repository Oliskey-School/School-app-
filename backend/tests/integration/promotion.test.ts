import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../../src/config/database';
import { AcademicService } from '../../src/services/academic.service';

const S = 'promo-school', B = 'promo-main';
const NEW_SESSION = '2026/2027';

let jss1ClassId: string, jss2ClassId: string;
let juniorId: string, seniorId: string, parentUserId: string;
let teacherUserId: string, adminUserId: string;

async function cleanup() {
    await prisma.notification.deleteMany({ where: { school_id: S } }).catch(() => {});
    await prisma.parentChild.deleteMany({ where: { school_id: S } }).catch(() => {});
    await prisma.parent.deleteMany({ where: { school_id: S } }).catch(() => {});
    await prisma.studentEnrollment.deleteMany({ where: { school_id: S } }).catch(() => {});
    await prisma.student.deleteMany({ where: { school_id: S } }).catch(() => {});
    await prisma.user.deleteMany({ where: { school_id: S } }).catch(() => {});
    await prisma.class.deleteMany({ where: { school_id: S } }).catch(() => {});
    await prisma.branch.deleteMany({ where: { school_id: S } }).catch(() => {});
    await prisma.school.delete({ where: { id: S } }).catch(() => {});
}

describe('End-of-session promotion', () => {
    beforeAll(async () => {
        await cleanup();
        await prisma.school.create({ data: { id: S, name: 'PR', code: 'PR', slug: S, plan_type: 'enterprise', subscription_status: 'active' } });
        await prisma.branch.create({ data: { id: B, school_id: S, name: 'Main', code: 'MAIN', is_main: true } });

        const jss1 = await prisma.class.create({ data: { school_id: S, branch_id: B, name: 'JSS 1', grade: 7, section: 'A' } });
        const jss2 = await prisma.class.create({ data: { school_id: S, branch_id: B, name: 'JSS 2', grade: 8, section: 'A' } });
        jss1ClassId = jss1.id; jss2ClassId = jss2.id;

        // Junior (JSS 1, grade 7) — will be promoted into JSS 2
        const ju = await prisma.user.create({ data: { email: 'promo-junior@test.local', password_hash: 'x', full_name: 'Junior', role: 'STUDENT' as any, school_id: S, branch_id: B } });
        const junior = await prisma.student.create({ data: { user_id: ju.id, school_id: S, branch_id: B, full_name: 'Junior', grade: 7, section: 'A' } });
        juniorId = junior.id;
        await prisma.studentEnrollment.create({ data: { student_id: juniorId, class_id: jss1ClassId, school_id: S, branch_id: B, status: 'Active', is_primary: true } });

        // Senior (SSS 3, grade 12) — will graduate
        const su = await prisma.user.create({ data: { email: 'promo-senior@test.local', password_hash: 'x', full_name: 'Senior', role: 'STUDENT' as any, school_id: S, branch_id: B } });
        const senior = await prisma.student.create({ data: { user_id: su.id, school_id: S, branch_id: B, full_name: 'Senior', grade: 12, section: 'A' } });
        seniorId = senior.id;

        // Parent linked to the junior — must get a celebration notice too
        const pu = await prisma.user.create({ data: { email: 'promo-parent@test.local', password_hash: 'x', full_name: 'Parent', role: 'PARENT' as any, school_id: S, branch_id: B } });
        parentUserId = pu.id;
        const parent = await prisma.parent.create({ data: { user_id: pu.id, school_id: S, branch_id: B, full_name: 'Parent' } });
        await prisma.parentChild.create({ data: { parent_id: parent.id, student_id: juniorId, school_id: S, branch_id: B } });

        // A teacher and a (non-actor) admin — should get a plain 'session-start'
        // bell notice, never the confetti 'promotion' notice.
        const tu = await prisma.user.create({ data: { email: 'promo-teacher@test.local', password_hash: 'x', full_name: 'Teacher', role: 'TEACHER' as any, school_id: S, branch_id: B } });
        teacherUserId = tu.id;
        const au = await prisma.user.create({ data: { email: 'promo-admin@test.local', password_hash: 'x', full_name: 'Admin', role: 'ADMIN' as any, school_id: S, branch_id: B } });
        adminUserId = au.id;
    }, 120000);

    afterAll(cleanup, 120000);

    it('promotes juniors a grade up, graduates SSS 3, moves enrollments, notifies students and parents', async () => {
        const result = await AcademicService.promoteStudents(S, B, NEW_SESSION, 'test-admin');
        expect(result.total).toBe(2);
        expect(result.promoted).toBe(1);
        expect(result.graduated).toBe(1);

        // Junior: grade 8, old enrollment Completed, new Active enrollment in JSS 2
        const junior = await prisma.student.findUnique({ where: { id: juniorId } });
        expect(junior!.grade).toBe(8);
        expect(junior!.status).toBe('Active');
        const enrollments = await prisma.studentEnrollment.findMany({ where: { student_id: juniorId } });
        expect(enrollments.find(e => e.class_id === jss1ClassId)!.status).toBe('Completed');
        expect(enrollments.find(e => e.class_id === jss2ClassId)!.status).toBe('Active');

        // Senior: graduated
        const senior = await prisma.student.findUnique({ where: { id: seniorId } });
        expect(senior!.status).toBe('Graduated');

        // Celebration notices: one each for the two students + one for the parent
        const notices = await prisma.notification.findMany({ where: { school_id: S, category: 'promotion' } });
        expect(notices.length).toBe(3);
        expect(notices.some(n => n.user_id === parentUserId)).toBe(true);
        expect(notices.some(n => n.title.includes('promoted'))).toBe(true);
        expect(notices.some(n => n.title.includes('Graduate'))).toBe(true);
    });

    it('notifies teachers and admins of the new session — bell notice, not a confetti one', async () => {
        const sessionNotices = await prisma.notification.findMany({ where: { school_id: S, category: 'session-start' } });
        // One for the teacher, one for the admin (actor was excluded)
        expect(sessionNotices.some(n => n.user_id === teacherUserId)).toBe(true);
        expect(sessionNotices.some(n => n.user_id === adminUserId)).toBe(true);

        // Staff must NOT receive the confetti 'promotion' notice
        const staffPromotion = await prisma.notification.findMany({
            where: { school_id: S, category: 'promotion', user_id: { in: [teacherUserId, adminUserId] } },
        });
        expect(staffPromotion.length).toBe(0);

        // The actor admin who ran it gets no bell notice (they saw the inline result)
        expect(sessionNotices.some(n => n.user_id === 'test-admin')).toBe(false);
    });

    it('running again is harmless for the graduate and moves the junior once more', async () => {
        const result = await AcademicService.promoteStudents(S, B, '2027/2028', 'test-admin');
        // Graduate is no longer Active → only the junior is processed
        expect(result.total).toBe(1);
        expect(result.promoted).toBe(1);
        const junior = await prisma.student.findUnique({ where: { id: juniorId } });
        expect(junior!.grade).toBe(9);
    });
});
