import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../../src/config/database';
import { AcademicService } from '../../src/services/academic.service';
import { ReportCardService } from '../../src/services/reportCard.service';

const S = 'rcf-school', B = 'rcf-main', B2 = 'rcf-branch2';
const TERM = 'First Term', SESSION = '2026/2027';

let studentId: string;
let userId: string;

async function cleanup() {
    await prisma.reportCard.deleteMany({ where: { school_id: S } }).catch(() => {});
    await prisma.academicPerformance.deleteMany({ where: { school_id: S } }).catch(() => {});
    await prisma.student.deleteMany({ where: { school_id: S } }).catch(() => {});
    await prisma.user.deleteMany({ where: { school_id: S } }).catch(() => {});
    await prisma.branch.deleteMany({ where: { school_id: S } }).catch(() => {});
    await prisma.school.delete({ where: { id: S } }).catch(() => {});
}

describe('Report card flow: teacher entry → submit → admin publish', () => {
    beforeAll(async () => {
        await cleanup();
        await prisma.school.create({ data: { id: S, name: 'RCF', code: 'RCF', slug: S, plan_type: 'enterprise', subscription_status: 'active' } });
        await prisma.branch.create({ data: { id: B, school_id: S, name: 'Main', code: 'MAIN', is_main: true } });
        await prisma.branch.create({ data: { id: B2, school_id: S, name: 'Second', code: 'BR2', is_main: false } });
        const user = await prisma.user.create({ data: {
            email: 'rcf-student@test.local', password_hash: 'x', full_name: 'RCF Student',
            role: 'STUDENT' as any, school_id: S, branch_id: B,
        }});
        userId = user.id;
        const student = await prisma.student.create({ data: {
            user_id: user.id, school_id: S, branch_id: B, full_name: 'RCF Student', grade: 10, section: 'A',
        }});
        studentId = student.id;
    }, 120000);

    afterAll(cleanup, 120000);

    it('teacher save stores scores AND tags the report card with the student\'s branch', async () => {
        const result = await AcademicService.upsertReportCard(studentId, S, {
            term: TERM,
            session: SESSION,
            status: 'Draft',
            academicRecords: [
                { subject: 'Mathematics', test1: 15, test2: 18, exam: 50, total: 83, grade: 'A', remark: 'Excellent' },
            ],
            // NOTE: no branchId passed — must fall back to the student's own branch
        });
        expect(result.branch_id).toBe(B);
        expect(result.status).toBe('Draft');
        expect(result.is_published).toBe(false);

        // AcademicPerformance rows must be branch-tagged too
        const perf = await prisma.academicPerformance.findMany({
            where: { school_id: S, student_id: studentId, term: TERM, session: SESSION }
        });
        expect(perf).toHaveLength(1);
        expect(perf[0].branch_id).toBe(B);
        expect(perf[0].score).toBe(83);
    });

    it('branch-scoped report card list shows the branch\'s reports (and other branches see nothing)', async () => {
        const mainBranch = await ReportCardService.getReportCards(S, B);
        expect(mainBranch).toHaveLength(1);
        expect(mainBranch[0].student_id).toBe(studentId);

        const otherBranch = await ReportCardService.getReportCards(S, B2);
        expect(otherBranch).toHaveLength(0);
    });

    it('teacher Submit → admin Publish flips is_published; details keep the entered scores', async () => {
        // Teacher submits
        const submitted = await AcademicService.upsertReportCard(studentId, S, {
            term: TERM, session: SESSION, status: 'Submitted',
            academicRecords: [
                { subject: 'Mathematics', test1: 15, test2: 18, exam: 50, total: 83, grade: 'A', remark: 'Excellent' },
            ],
            branchId: B,
        });
        expect(submitted.status).toBe('Submitted');
        expect(submitted.is_published).toBe(false);

        // Admin publishes
        const published = await ReportCardService.updateStatus(S, B, submitted.id, 'Published');
        expect(published.status).toBe('Published');
        expect(published.is_published).toBe(true);

        // The student's report card details preserve the teacher's exact entries
        const details = await AcademicService.getReportCardDetails(S, studentId, TERM, SESSION);
        expect(details.status).toBe('Published');
        const math = details.academic_records.find((r: any) => r.subject === 'Mathematics');
        expect(math).toBeTruthy();
        expect(math.test1).toBe(15);
        expect(math.test2).toBe(18);
        expect(math.exam).toBe(50);
        expect(math.total).toBe(83);
        expect(math.grade).toBe('A');
    });

    it('admin Unpublish (back to Submitted) hides it from students again', async () => {
        const rc = await prisma.reportCard.findFirst({ where: { school_id: S, student_id: studentId } });
        const result = await ReportCardService.updateStatus(S, B, rc!.id, 'Submitted');
        expect(result.status).toBe('Submitted');
        expect(result.is_published).toBe(false);
    });

    it('bulk publish targets only the given branch/term/session', async () => {
        const res = await ReportCardService.publishReportCards(S, B, TERM, SESSION);
        expect(res.count).toBe(1);
        const rc = await prisma.reportCard.findFirst({ where: { school_id: S, student_id: studentId } });
        expect(rc!.is_published).toBe(true);

        // A different branch has nothing to publish
        const resB2 = await ReportCardService.publishReportCards(S, B2, TERM, SESSION);
        expect(resB2.count).toBe(0);
    });
});
