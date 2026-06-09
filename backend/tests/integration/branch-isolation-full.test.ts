/**
 * FULL BRANCH + SCHOOL ISOLATION AUDIT (real database)
 *
 * Builds the owner's exact scenario: TWO schools, TWO branches each, with a full
 * data set seeded into ALL FOUR branches — students, teachers, classes, subjects,
 * attendance, results, report cards, assignments, fees, notifications, exams,
 * timetables, CBT/quizzes and lesson notes.
 *
 * Acting as the School-A admin focused on one branch at a time, it hits every
 * module's list endpoint and asserts the response contains ONLY the active
 * branch's data — never another branch in the same school, and never another
 * school. Each record is tagged with a per-branch marker (__ISO_<branch>__), so a
 * leak shows up as a foreign tag in the response.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import prisma from '../../src/config/database';
import { config } from '../../src/config/env';

const SA = 'iso-a', SB = 'iso-b';
const BR = { A1: 'iso-a1', A2: 'iso-a2', B1: 'iso-b1', B2: 'iso-b2' };
const SCHOOL_OF: Record<string, string> = { A1: SA, A2: SA, B1: SB, B2: SB };
const CODE: Record<string, string> = { A1: 'ISOA', A2: 'ISOA', B1: 'ISOB', B2: 'ISOB' };
const ADMIN_A = 'iso-admin-a';
const tag = (b: string) => `__ISO_${b}__`;

const ids: Record<string, any> = { A1: {}, A2: {}, B1: {}, B2: {} };

// Main admin of School A (branch_id null → may focus any A branch via header).
const adminToken = () => jwt.sign(
  { id: ADMIN_A, email: 'iso-admin-a@x.com', role: 'ADMIN', school_id: SA, branch_id: null, allowed_branch_ids: [] },
  config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });
const get = (path: string, branch: string) =>
  request(app).get(path).set('Authorization', `Bearer ${adminToken()}`).set('X-Branch-Id', BR[branch as keyof typeof BR]);

async function cleanup() {
  for (const s of [SA, SB]) {
    for (const m of ['attendance', 'academicPerformance', 'reportCard', 'assignment', 'fee', 'studentFee',
      'notification', 'exam', 'timetable', 'quiz', 'lessonPlan', 'lessonNote', 'behaviorNote', 'student',
      'teacher', 'class', 'subject', 'schoolMembership', 'user', 'branch'] as const) {
      await (prisma as any)[m]?.deleteMany?.({ where: { school_id: s } }).catch(() => {});
    }
    await prisma.school.delete({ where: { id: s } }).catch(() => {});
  }
}

async function seedBranch(key: keyof typeof BR) {
  const school = SCHOOL_OF[key], branch = BR[key], code = CODE[key], t = tag(key);
  const cls = await prisma.class.create({ data: { school_id: school, branch_id: branch, name: t, grade: 7, section: key } });
  const subj = await prisma.subject.create({ data: { school_id: school, branch_id: branch, name: t } });
  const stuU = await prisma.user.create({ data: { id: `${branch}-stu-u`, email: `${branch}-stu@x.com`, password_hash: 'x', full_name: t, role: 'STUDENT' as any, school_id: school, branch_id: branch, school_generated_id: `${code}_${key}_STU_0001` } });
  const stu = await prisma.student.create({ data: { user_id: stuU.id, school_id: school, branch_id: branch, full_name: t, grade: 7 } });
  const tchU = await prisma.user.create({ data: { id: `${branch}-tch-u`, email: `${branch}-tch@x.com`, password_hash: 'x', full_name: t, role: 'TEACHER' as any, school_id: school, branch_id: branch, school_generated_id: `${code}_${key}_TCH_0001` } });
  const tch = await prisma.teacher.create({ data: { user_id: tchU.id, school_id: school, branch_id: branch, full_name: t, school_generated_id: `${code}_${key}_TCH_0001`, subject_specialty: [], curriculum_eligibility: ['Nigerian'] } });

  await prisma.attendance.create({ data: { student_id: stu.id, class_id: cls.id, date: new Date(), status: t, school_id: school, branch_id: branch } });
  await prisma.academicPerformance.create({ data: { student_id: stu.id, school_id: school, branch_id: branch, subject: t, score: 80, term: 'First', session: '2025/2026' } });
  await prisma.reportCard.create({ data: { school_id: school, branch_id: branch, student_id: stu.id, session: t, term: 'First' } });
  await prisma.assignment.create({ data: { class_id: cls.id, title: t, subject: t, due_date: new Date(), school_id: school, branch_id: branch } });
  await prisma.fee.create({ data: { school_id: school, branch_id: branch, title: t, amount: 1000, due_date: new Date() } });
  await prisma.studentFee.create({ data: { student_id: stu.id, school_id: school, branch_id: branch, title: t, amount: 1000, due_date: new Date() } as any });
  await prisma.lessonNote.create({ data: { school_id: school, branch_id: branch, teacher_id: tch.id, class_id: cls.id, subject_id: subj.id, term: 'First', week: 1, title: t, content: t } as any });
  await prisma.notification.create({ data: { school_id: school, branch_id: branch, title: t, message: t } });
  await prisma.exam.create({ data: { school_id: school, branch_id: branch, title: t, subject: t } });
  await prisma.timetable.create({ data: { school_id: school, branch_id: branch, subject: t, start_time: '08:00', end_time: '09:00', class_name: t, day_of_week: 1 } as any });
  await prisma.quiz.create({ data: { school_id: school, branch_id: branch, teacher_id: tch.id, class_id: cls.id, subject_id: subj.id, title: t, total_marks: 20 } as any });
  await prisma.lessonPlan.create({ data: { school_id: school, branch_id: branch, teacher_id: tch.id, class_id: cls.id, subject_id: subj.id, topic: t, term: 'First', week_number: 1 } as any });

  ids[key] = { cls: cls.id, subj: subj.id, stu: stu.id, tch: tch.id };
}

describe('Full branch + school isolation', () => {
  beforeAll(async () => {
    await cleanup();
    for (const [id, code] of [[SA, 'ISOA'], [SB, 'ISOB']] as const) {
      await prisma.school.create({ data: { id, name: id, code, slug: id, plan_type: 'enterprise', subscription_status: 'active' } });
    }
    for (const k of ['A1', 'A2', 'B1', 'B2'] as const) {
      await prisma.branch.create({ data: { id: BR[k], school_id: SCHOOL_OF[k], name: k, code: `${CODE[k]}${k}`, is_main: k.endsWith('1') } });
    }
    await prisma.user.create({ data: { id: ADMIN_A, email: 'iso-admin-a@x.com', password_hash: 'x', full_name: 'ISO Admin A', role: 'ADMIN' as any, school_id: SA, branch_id: null } });
    for (const k of ['A1', 'A2', 'B1', 'B2'] as const) await seedBranch(k);
  }, 120000);

  afterAll(cleanup, 120000);

  // Every module the owner named. Each must show ONLY the active branch's data.
  const MODULES: Array<[string, string]> = [
    ['Attendance', '/api/attendance'],
    ['Results / grades', '/api/academic/performance'],
    ['Report cards', '/api/report-cards'],
    ['Assignments / lesson work', '/api/assignments'],
    ['Fees', '/api/fees'],
    ['Notifications', '/api/notifications'],
    ['Exams', '/api/exams'],
    ['Timetable', '/api/timetables'],
    ['CBT / quizzes', '/api/quizzes'],
    ['Lesson notes', '/api/lesson-plans'],
    ['Students', '/api/students'],
    ['Teachers', '/api/teachers'],
    ['Classes', '/api/classes'],
    ['Subjects', '/api/subjects'],
    ['Behavior', '/api/behavior/notes'],
    ['Dashboard stats', '/api/dashboard/stats'],
  ];

  // The decisive isolation check: when focused on branch X, the response must never
  // contain ANOTHER branch's tag (same school OR other school).
  for (const [label, path] of MODULES) {
    it(`${label}: focused on A1 shows no A2 / B1 / B2 data`, async () => {
      const res = await get(path, 'A1');
      expect(res.status).toBeLessThan(500);
      const body = JSON.stringify(res.body ?? '');
      expect(body).not.toContain(tag('A2')); // other branch, same school
      expect(body).not.toContain(tag('B1')); // other school
      expect(body).not.toContain(tag('B2')); // other school
    });
    it(`${label}: focused on A2 shows no A1 / B1 / B2 data`, async () => {
      const res = await get(path, 'A2');
      expect(res.status).toBeLessThan(500);
      const body = JSON.stringify(res.body ?? '');
      expect(body).not.toContain(tag('A1'));
      expect(body).not.toContain(tag('B1'));
      expect(body).not.toContain(tag('B2'));
    });
  }

  // Coverage probe: confirm the "no leak" passes aren't just empty responses —
  // each list endpoint should actually RETURN the active branch's own record.
  it('coverage: each list endpoint returns the active branch data (not empty)', async () => {
    const LIST: Array<[string, string]> = [
      ['Report cards', '/api/report-cards'], ['Assignments', '/api/assignments'],
      ['Fees', '/api/fees'], ['Exams', '/api/exams'], ['Timetable', '/api/timetables'],
      ['CBT/quizzes', '/api/quizzes'], ['Lesson notes', '/api/lesson-plans'],
      ['Students', '/api/students'], ['Teachers', '/api/teachers'],
      ['Classes', '/api/classes'], ['Subjects', '/api/subjects'],
    ];
    const empties: string[] = [];
    for (const [lbl, p] of LIST) {
      const res = await get(p, 'A1');
      if (!JSON.stringify(res.body ?? '').includes(tag('A1'))) empties.push(`${lbl} (${p}) -> ${res.status}`);
    }
    // If any list endpoint can't even surface its OWN branch data, that's worth knowing.
    if (empties.length) console.log('Endpoints not returning active-branch data:', empties);
    expect(empties).toEqual([]);
  }, 120000);

  // ---- TEACHER DASHBOARD (owner explicitly called this out) ----
  // Act as the branch-A1 teacher; nothing from A2 / B1 / B2 may appear.
  describe('Teacher dashboard isolation (branch A1 teacher)', () => {
    const tchToken = () => jwt.sign(
      { id: 'iso-a1-tch-u', email: 'iso-a1-tch@x.com', role: 'TEACHER', school_id: SA, branch_id: BR.A1, allowed_branch_ids: [] },
      config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });
    const tget = (p: string) => request(app).get(p).set('Authorization', `Bearer ${tchToken()}`).set('X-Branch-Id', BR.A1);
    const TPATHS = [
      '/api/teachers/me', '/api/teachers/me/students', '/api/dashboard/stats',
      '/api/lesson-plans', '/api/quizzes', '/api/assignments', '/api/notifications',
    ];
    for (const p of TPATHS) {
      it(`teacher page ${p} shows no other-branch/other-school data`, async () => {
        const res = await tget(p);
        expect(res.status).toBeLessThan(500);
        const body = JSON.stringify(res.body ?? '');
        expect(body).not.toContain(tag('A2'));
        expect(body).not.toContain(tag('B1'));
        expect(body).not.toContain(tag('B2'));
      });
    }
  });
});
