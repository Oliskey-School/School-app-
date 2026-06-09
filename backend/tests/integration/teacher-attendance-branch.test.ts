/**
 * TEACHER ATTENDANCE IS PER-BRANCH.
 *
 * Regression for: a multi-branch teacher's daily attendance was a single row keyed
 * by (teacher, date), so checking in from a second branch (Lekki) silently
 * overwrote the first branch's (Main) row and never showed in Lekki. The key now
 * includes branch_id, so each branch has its own record + history.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../../src/config/database';
import { TeacherService } from '../../src/services/teacher.service';

const S = 'tab-school', M = 'tab-main', L = 'tab-lekki', UID = 'tab-tch-u';

async function cleanup() {
  for (const m of ['teacherAttendance', 'teacher', 'schoolMembership', 'user', 'branch'] as const) {
    await (prisma as any)[m]?.deleteMany?.({ where: { school_id: S } }).catch(() => {});
  }
  await prisma.school.delete({ where: { id: S } }).catch(() => {});
}

describe('Teacher attendance per branch', () => {
  beforeAll(async () => {
    await cleanup();
    await prisma.school.create({ data: { id: S, name: 'TAB', code: 'TAB', slug: S, plan_type: 'premium', subscription_status: 'active' } });
    await prisma.branch.create({ data: { id: M, school_id: S, name: 'Main', code: 'TABM', is_main: true } });
    await prisma.branch.create({ data: { id: L, school_id: S, name: 'Lekki', code: 'TABL', is_main: false } });
    const u = await prisma.user.create({ data: { id: UID, email: 'tab-tch@x.com', password_hash: 'x', full_name: 'Multi Teacher', role: 'TEACHER' as any, school_id: S, branch_id: M, allowed_branch_ids: [L] } });
    await prisma.teacher.create({ data: { user_id: u.id, school_id: S, branch_id: M, full_name: 'Multi Teacher', subject_specialty: [], curriculum_eligibility: ['Nigerian'], allowed_branch_ids: [L] } });
  }, 60000);
  afterAll(cleanup, 60000);

  it('check-in in Main and Lekki create SEPARATE records, each visible only in its branch', async () => {
    await TeacherService.submitMyAttendance(S, M, UID);
    await TeacherService.submitMyAttendance(S, L, UID);

    const inMain = await TeacherService.getMyAttendanceHistory(S, M, UID, 10);
    const inLekki = await TeacherService.getMyAttendanceHistory(S, L, UID, 10);

    expect(inMain.length).toBe(1);
    expect(inLekki.length).toBe(1);
    expect((inMain[0] as any).branch_id).toBe(M);
    expect((inLekki[0] as any).branch_id).toBe(L);
  });
});
