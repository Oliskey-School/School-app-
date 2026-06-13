/**
 * WRITE ISOLATION SWEEP (real database)
 *
 * For EVERY major "create" path, when work happens in a sub-branch the new row
 * must be stamped with THAT school + sub-branch — never the main branch — and
 * must be invisible when scoped to the main branch. This is the core guarantee
 * that "each school and branch has its own rows".
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../../src/config/database';
import { ParentService } from '../../src/services/parent.service';
import { TeacherService } from '../../src/services/teacher.service';
import { StudentService } from '../../src/services/student.service';
import { NoticeService } from '../../src/services/notice.service';
import { ClassService } from '../../src/services/class.service';
import { ExamService } from '../../src/services/exam.service';

const S = 'wis-school';
const MAIN = 'wis-main';   // main branch
const SUB = 'wis-sub';     // sub-branch — everything here must stay here
const ADMIN = 'wis-admin';

async function cleanup() {
  for (const m of ['announcement', 'exam', 'class', 'parent', 'teacher', 'student', 'user', 'branch'] as const) {
    await (prisma as any)[m].deleteMany({ where: { school_id: S } }).catch(() => {});
  }
  await prisma.school.delete({ where: { id: S } }).catch(() => {});
}

describe('Write isolation sweep — every create stamps the active sub-branch', () => {
  beforeAll(async () => {
    await cleanup();
    await prisma.school.create({ data: { id: S, name: 'WIS', code: 'WIS', slug: S, plan_type: 'enterprise', subscription_status: 'active' } });
    await prisma.branch.create({ data: { id: MAIN, school_id: S, name: 'Main', code: 'MAIN', is_main: true } });
    await prisma.branch.create({ data: { id: SUB, school_id: S, name: 'Sub', code: 'SUB', is_main: false } });
    await prisma.user.create({ data: { id: ADMIN, email: 'wis-admin@x.com', password_hash: 'x', full_name: 'WIS Admin', role: 'ADMIN' as any, school_id: S, branch_id: MAIN } });
  }, 120000);

  afterAll(cleanup, 120000);

  // helper: a row is correctly isolated to SUB
  const inSub = (row: any) => {
    expect(row).toBeTruthy();
    expect(row.school_id).toBe(S);
    expect(row.branch_id).toBe(SUB);
  };

  it('Add Parent → row in the sub-branch', async () => {
    await ParentService.createParent(S, SUB, { full_name: 'P Sub', email: 'p-sub@wis.com' }, ADMIN);
    const row = await prisma.parent.findFirst({ where: { school_id: S } });
    inSub(row);
    const inMain = await prisma.parent.findMany({ where: { school_id: S, branch_id: MAIN } });
    expect(inMain.length).toBe(0);
  });

  it('Add Teacher → row in the sub-branch', async () => {
    await TeacherService.createTeacher(S, SUB, { full_name: 'T Sub', email: 't-sub@wis.com' });
    const row = await prisma.teacher.findFirst({ where: { school_id: S } });
    inSub(row);
  });

  it('Enroll Student → row in the sub-branch', async () => {
    await StudentService.enrollStudent(S, SUB, { firstName: 'S', lastName: 'Sub', email: 's-sub@wis.com' }, 'ADMIN', ADMIN);
    const row = await prisma.student.findFirst({ where: { school_id: S } });
    inSub(row);
  });

  it('Publish Notice → row in the sub-branch', async () => {
    await NoticeService.createNotice(S, SUB, { title: 'N Sub', content: 'x', category: 'general', audience: ['all'] });
    const row = await prisma.announcement.findFirst({ where: { school_id: S } });
    inSub(row);
  });

  it('Create Class → row in the sub-branch', async () => {
    await ClassService.createClass(S, SUB, { name: 'JSS1-Sub', grade: 7, section: 'A' });
    const row = await prisma.class.findFirst({ where: { school_id: S } });
    inSub(row);
  });

  it('Create Exam → row in the sub-branch', async () => {
    await ExamService.createExam(S, SUB, { title: 'Midterm Sub', type: 'Midterm', subject: 'Mathematics', date: new Date().toISOString() });
    const row = await prisma.exam.findFirst({ where: { school_id: S } });
    inSub(row);
  });

  it('NOTHING leaked into the main branch', async () => {
    for (const m of ['parent', 'teacher', 'student', 'announcement', 'class', 'exam'] as const) {
      const mainRows = await (prisma as any)[m].findMany({ where: { school_id: S, branch_id: MAIN } });
      expect(mainRows.length, `${m} leaked into main`).toBe(0);
    }
  });
});
