/**
 * PER-STUDENT SUBJECTS — admin assignment is the source everywhere.
 *
 * The admin picks a student's subjects on the Edit Student screen; that selection
 * must be saved on the student and become the authoritative list returned by the
 * student's "My Subjects" (and the admin/teacher view of it), regardless of the
 * subjects attached to the student's class. Empty assignment falls back to class.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../../src/config/database';
import { StudentService } from '../../src/services/student.service';

const S = 'ssub-school', B = 'ssub-branch';
let studentId = '';

async function cleanup() {
  for (const m of ['studentEnrollment', 'student', 'class', 'subject', 'user', 'branch'] as const) {
    await (prisma as any)[m]?.deleteMany?.({ where: { school_id: S } }).catch(() => {});
  }
  await prisma.school.delete({ where: { id: S } }).catch(() => {});
}

describe('Per-student subjects', () => {
  beforeAll(async () => {
    await cleanup();
    await prisma.school.create({ data: { id: S, name: 'SSUB', code: 'SSUB', slug: S, plan_type: 'premium', subscription_status: 'active' } });
    await prisma.branch.create({ data: { id: B, school_id: S, name: 'Main', code: 'SSUBM', is_main: true } });
    // The school offers these real subjects.
    for (const n of ['Mathematics', 'French', 'Basic Science']) {
      await prisma.subject.create({ data: { school_id: S, branch_id: B, name: n } });
    }
    const su = await prisma.user.create({ data: { id: 'ssub-stu-u', email: 'ssub-stu@x.com', password_hash: 'x', full_name: 'Sub Pupil', role: 'STUDENT' as any, school_id: S, branch_id: B } });
    studentId = (await prisma.student.create({ data: { user_id: su.id, school_id: S, branch_id: B, full_name: 'Sub Pupil', grade: 7 } })).id;
  }, 60000);

  afterAll(cleanup, 60000);

  it('admin assignment is saved and returned by My Subjects', async () => {
    await StudentService.updateStudent(S, B, studentId, { subjects: ['Mathematics', 'French'] });
    const subs = await StudentService.getMySubjects(S, studentId);
    const names = subs.map((x: any) => x.name).sort();
    expect(names).toEqual(['French', 'Mathematics']);
  });

  it('the admin/teacher view of the student\'s subjects matches', async () => {
    const subs = await StudentService.getStudentSubjects(S, studentId);
    expect(subs.map((x: any) => x.name).sort()).toEqual(['French', 'Mathematics']);
  });

  it('removing a subject reflects immediately', async () => {
    await StudentService.updateStudent(S, B, studentId, { subjects: ['Mathematics'] });
    const subs = await StudentService.getMySubjects(S, studentId);
    expect(subs.map((x: any) => x.name)).toEqual(['Mathematics']);
  });

  it('empty assignment falls back (does not crash)', async () => {
    await StudentService.updateStudent(S, B, studentId, { subjects: [] });
    const subs = await StudentService.getMySubjects(S, studentId);
    expect(Array.isArray(subs)).toBe(true); // falls back to class/grade/school subjects
  });
});
