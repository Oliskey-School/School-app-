/**
 * TEACHER DASHBOARD STATS — per-branch isolation.
 *
 * Reproduces the reported bug: a teacher assigned to BOTH the Main branch (where
 * they have classes/students) and a second branch (where they have none). After
 * switching to the second branch the dashboard still showed Main's counts
 * ("2 classes / 7 students") because the stats counted the teacher's classes
 * across every branch. The cards must reflect ONLY the active branch.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import prisma from '../../src/config/database';
import { config } from '../../src/config/env';

const S = 'tsb-school', M = 'tsb-main', L = 'tsb-lekki';
const TUSER = 'tsb-tch-u';
let teacherId = '';

const token = () => jwt.sign(
  { id: TUSER, email: 'tsb-tch@x.com', role: 'TEACHER', school_id: S, branch_id: M, allowed_branch_ids: [L] },
  config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });
const stats = (branch: string) =>
  request(app).get(`/api/dashboard/stats?teacherId=${teacherId}&schoolId=${S}&branchId=${branch}`)
    .set('Authorization', `Bearer ${token()}`).set('X-Branch-Id', branch);

async function cleanup() {
  for (const m of ['teacherAttendance', 'studentEnrollment', 'classTeacher', 'student', 'teacher', 'class', 'schoolMembership', 'user', 'branch'] as const) {
    await (prisma as any)[m]?.deleteMany?.({ where: { school_id: S } }).catch(() => {});
  }
  await prisma.school.delete({ where: { id: S } }).catch(() => {});
}

describe('Teacher dashboard stats are per-branch', () => {
  beforeAll(async () => {
    await cleanup();
    await prisma.school.create({ data: { id: S, name: 'TSB', code: 'TSB', slug: S, plan_type: 'premium', subscription_status: 'active' } });
    await prisma.branch.create({ data: { id: M, school_id: S, name: 'Main', code: 'TSBM', is_main: true } });
    await prisma.branch.create({ data: { id: L, school_id: S, name: 'Lekki', code: 'TSBL', is_main: false } });

    // Teacher homed in Main, ALSO authorised for Lekki (multi-branch teacher).
    const tu = await prisma.user.create({ data: { id: TUSER, email: 'tsb-tch@x.com', password_hash: 'x', full_name: 'John Smith', role: 'TEACHER' as any, school_id: S, branch_id: M, allowed_branch_ids: [L], school_generated_id: 'TSB_TSBM_TCH_0001' } });
    const tch = await prisma.teacher.create({ data: { user_id: tu.id, school_id: S, branch_id: M, full_name: 'John Smith', school_generated_id: 'TSB_TSBM_TCH_0001', subject_specialty: [], curriculum_eligibility: ['Nigerian'], allowed_branch_ids: [L] } });
    teacherId = tch.id;

    // A class + assigned student in MAIN; NONE in Lekki.
    const cls = await prisma.class.create({ data: { school_id: S, branch_id: M, name: 'SSS 1', grade: 11, section: 'A' } });
    await prisma.classTeacher.create({ data: { class_id: cls.id, teacher_id: tch.id, school_id: S, branch_id: M } });
    const su = await prisma.user.create({ data: { id: 'tsb-stu-u', email: 'tsb-stu@x.com', password_hash: 'x', full_name: 'Pupil', role: 'STUDENT' as any, school_id: S, branch_id: M } });
    const stu = await prisma.student.create({ data: { user_id: su.id, school_id: S, branch_id: M, full_name: 'Pupil', grade: 11, status: 'Active' } });
    await prisma.studentEnrollment.create({ data: { student_id: stu.id, class_id: cls.id, school_id: S, branch_id: M } });

    // A personal attendance check-in recorded in MAIN (none in Lekki).
    await prisma.teacherAttendance.create({ data: { teacher_id: tch.id, school_id: S, branch_id: M, date: '2026-06-09', status: 'present', approval_status: 'approved', check_in: '08:00' } as any });
  }, 60000);

  afterAll(cleanup, 60000);

  const meGet = (path: string, branch: string) =>
    request(app).get(path).set('Authorization', `Bearer ${token()}`).set('X-Branch-Id', branch);
  const arr = (b: any) => (Array.isArray(b) ? b : b?.data || b?.students || []);

  it('Main branch: shows the teacher\'s 1 class and 1 student', async () => {
    const res = await stats(M);
    expect(res.status).toBe(200);
    expect(res.body.totalClasses).toBe(1);
    expect(res.body.totalStudents).toBe(1);
  });

  it('Lekki branch: shows 0 classes and 0 students (none assigned there)', async () => {
    const res = await stats(L);
    expect(res.status).toBe(200);
    expect(res.body.totalClasses).toBe(0);  // was 1 before the fix (leaked Main)
    expect(res.body.totalStudents).toBe(0); // was 1 before the fix
  });

  it('My Attendance: shows the Main check-in in Main, but NOT in Lekki', async () => {
    const inMain = await meGet('/api/teachers/me/attendance', M);
    const inLekki = await meGet('/api/teachers/me/attendance', L);
    expect(arr(inMain.body).length).toBeGreaterThanOrEqual(1);
    expect(arr(inLekki.body).length).toBe(0); // was identical to Main before the fix
  });

  it('My Students: lists the Main student in Main, none in Lekki', async () => {
    const inMain = await meGet('/api/teachers/me/students', M);
    const inLekki = await meGet('/api/teachers/me/students', L);
    expect(arr(inMain.body).length).toBeGreaterThanOrEqual(1);
    expect(arr(inLekki.body).length).toBe(0);
  });

  it('Teacher profile PERSISTS across branches (master account always shows)', async () => {
    for (const b of [M, L]) {
      const res = await meGet('/api/teachers/me', b);
      expect(res.status).toBe(200);
      expect(res.body?.full_name || res.body?.fullName).toBe('John Smith');
    }
  });
});
