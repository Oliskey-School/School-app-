/**
 * Regression: two 500s seen in production logs
 *   1) POST /api/academic/upsert-report-card → AcademicPerformance.create missing
 *      required `session` (frontend omitted it).
 *   2) VerificationService.createVerification → VerificationCode.create missing
 *      required `school_id`.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../../src/config/database';
import { AcademicService } from '../../src/services/academic.service';
import { VerificationService } from '../../src/services/verification.service';

const S = 'rcv-school', B = 'rcv-main', U = 'rcv-user', ST = 'rcv-student';

async function cleanup() {
  await (prisma as any).academicPerformance.deleteMany({ where: { school_id: S } }).catch(() => {});
  await (prisma as any).verificationCode.deleteMany({ where: { school_id: S } }).catch(() => {});
  for (const m of ['reportCard', 'student', 'user', 'branch'] as const) {
    await (prisma as any)[m]?.deleteMany?.({ where: { school_id: S } }).catch(() => {});
  }
  await prisma.school.delete({ where: { id: S } }).catch(() => {});
}

describe('Report card + verification 500 regressions', () => {
  beforeAll(async () => {
    await cleanup();
    await prisma.school.create({ data: { id: S, name: 'RCV', code: 'RCV', slug: S, plan_type: 'enterprise', subscription_status: 'active' } });
    await prisma.branch.create({ data: { id: B, school_id: S, name: 'Main', code: 'MAIN', is_main: true } });
    await prisma.user.create({ data: { id: U, email: 'rcv@x.com', password_hash: 'x', full_name: 'RCV User', role: 'STUDENT' as any, school_id: S, branch_id: B } });
    await prisma.student.create({ data: { id: ST, user_id: U, school_id: S, branch_id: B, full_name: 'RCV Student', grade: 7 } });
  }, 120000);

  afterAll(cleanup, 120000);

  it('upsert-report-card persists a grade even when `session` is omitted', async () => {
    await AcademicService.upsertReportCard(ST, S, {
      term: 'First Term',
      academicRecords: [{ subject: 'Mathematics', total: 80 }],
    });
    const rows = await (prisma as any).academicPerformance.findMany({ where: { school_id: S, student_id: ST } });
    expect(rows.length).toBe(1);
    expect(rows[0].subject).toBe('Mathematics');
    expect(rows[0].session).toBeTruthy();      // defaulted, not missing
    expect(rows[0].term).toBe('First Term');
  });

  it('createVerification persists a code with the user\'s school_id', async () => {
    const res = await VerificationService.createVerification(U, 'rcv@x.com', 'RCV User', 'email_verification');
    expect(res.code).toBeTruthy();
    const rows = await (prisma as any).verificationCode.findMany({ where: { user_id: U } });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].school_id).toBe(S);
  });
});
