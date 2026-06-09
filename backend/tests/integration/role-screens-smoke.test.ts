/**
 * ROLE SCREENS SMOKE (real database) — production "no failing page" guard.
 *
 * For EACH role (Admin, Teacher, Student, Parent) it hits the backend endpoints
 * that role's screens load, and asserts none of them return a 5xx server error.
 * A page "fails" in production almost always because the endpoint it calls 500s —
 * this catches exactly that across every module, for every role, with a real DB.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import prisma from '../../src/config/database';
import { config } from '../../src/config/env';

const S = 'rss-school', B = 'rss-branch';
const U = { admin: 'rss-admin', teacher: 'rss-tch-u', student: 'rss-stu-u', parent: 'rss-par-u' };
let teacherId = '', studentId = '', parentId = '';

const tok = (id: string, role: string, branch: string | null) =>
  jwt.sign({ id, email: `${id}@x.com`, role, school_id: S, branch_id: branch, allowed_branch_ids: [] },
    config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });

async function cleanup() {
  for (const m of ['studentEnrollment', 'classTeacher', 'parentChild', 'parent', 'student', 'teacher',
    'class', 'subject', 'schoolMembership', 'user', 'branch'] as const) {
    await (prisma as any)[m]?.deleteMany?.({ where: { school_id: S } }).catch(() => {});
  }
  await prisma.school.delete({ where: { id: S } }).catch(() => {});
}

describe('Role screens smoke (no failing page)', () => {
  beforeAll(async () => {
    await cleanup();
    await prisma.school.create({ data: { id: S, name: 'RSS', code: 'RSS', slug: S, plan_type: 'enterprise', subscription_status: 'active' } });
    await prisma.branch.create({ data: { id: B, school_id: S, name: 'Main', code: 'RSSM', is_main: true } });
    await prisma.user.create({ data: { id: U.admin, email: 'rss-admin@x.com', password_hash: 'x', full_name: 'RSS Admin', role: 'ADMIN' as any, school_id: S, branch_id: null } });
    const tu = await prisma.user.create({ data: { id: U.teacher, email: 'rss-tch-u@x.com', password_hash: 'x', full_name: 'RSS Teacher', role: 'TEACHER' as any, school_id: S, branch_id: B, school_generated_id: 'RSS_RSSM_TCH_0001' } });
    teacherId = (await prisma.teacher.create({ data: { user_id: tu.id, school_id: S, branch_id: B, full_name: 'RSS Teacher', school_generated_id: 'RSS_RSSM_TCH_0001', subject_specialty: [], curriculum_eligibility: ['Nigerian'] } })).id;
    const su = await prisma.user.create({ data: { id: U.student, email: 'rss-stu-u@x.com', password_hash: 'x', full_name: 'RSS Student', role: 'STUDENT' as any, school_id: S, branch_id: B, school_generated_id: 'RSS_RSSM_STU_0001' } });
    studentId = (await prisma.student.create({ data: { user_id: su.id, school_id: S, branch_id: B, full_name: 'RSS Student', grade: 7, school_generated_id: 'RSS_RSSM_STU_0001' } })).id;
    const pu = await prisma.user.create({ data: { id: U.parent, email: 'rss-par-u@x.com', password_hash: 'x', full_name: 'RSS Parent', role: 'PARENT' as any, school_id: S, branch_id: B, school_generated_id: 'RSS_RSSM_PAR_0001' } });
    parentId = (await prisma.parent.create({ data: { user_id: pu.id, school_id: S, branch_id: B, full_name: 'RSS Parent' } })).id;
  }, 120000);

  afterAll(cleanup, 120000);

  const ADMIN: string[] = [
    '/api/students', '/api/teachers', '/api/parents', '/api/classes', '/api/subjects', '/api/users',
    '/api/notices', '/api/calendar', '/api/attendance', '/api/fees', '/api/fees/analytics', '/api/exams',
    '/api/timetables', '/api/quizzes', '/api/lesson-plans', '/api/report-cards', '/api/assignments',
    '/api/behavior/notes', '/api/buses', '/api/dashboard/stats', '/api/branches', '/api/branches/authorized',
    '/api/academic/performance', '/api/academic/subjects', '/api/academic/curricula', '/api/academic/tracks',
    '/api/payroll/payslips', '/api/payroll/transactions', '/api/payroll/leave-requests', '/api/payroll/arrears',
    '/api/transport/routes', '/api/transport/stops', '/api/transport/assignments', '/api/hostels',
    '/api/hostels/rooms', '/api/hostels/allocations', '/api/infrastructure/facilities', '/api/infrastructure/assets',
    '/api/inspections', '/api/governance/compliance', '/api/health', '/api/gallery', '/api/community/surveys',
    '/api/community/helplines', '/api/extracurriculars', '/api/extracurriculars/events', '/api/conferences',
    '/api/counseling', '/api/maintenance', '/api/store/products', '/api/store/orders', '/api/vendors',
    '/api/id-cards', '/api/id-cards/stats', '/api/audit-logs', '/api/notifications', '/api/forum/topics',
    '/api/resources', '/api/resources/courses', '/api/pd/courses', '/api/policy/policies', '/api/payment-plans',
    '/api/analytics', '/api/admin-hub/reports/saved', '/api/admin-hub/invoices', '/api/admin-hub/sessions',
    '/api/admin-hub/config', '/api/plans', '/api/transactions', '/api/emergency', '/api/calendar',
    '/api/school-documents', '/api/teacher-salaries', '/api/payslips', '/api/compliance-checklists',
  ];

  const TEACHER: string[] = [
    '/api/teachers/me', '/api/teachers/me/appointments', '/api/teachers/me/attendance', '/api/teachers/me/students',
    '/api/teachers/me/badges', '/api/teachers/me/recognitions', '/api/teachers/me/mentoring',
    '/api/teachers/me/substitutes', '/api/teachers/me/pd-courses', '/api/dashboard/stats', '/api/lesson-plans',
    '/api/quizzes', '/api/assignments', '/api/exams', '/api/timetables', '/api/notifications', '/api/resources',
    '/api/forum/topics', '/api/chat/contacts', '/api/pd/courses', '/api/pd/my-enrollments', '/api/academic/performance',
    '/api/classes', '/api/students', '/api/calendar',
  ];

  const STUDENT: string[] = [
    '/api/students/me', '/api/students/me/performance', '/api/students/me/quiz-results', '/api/students/me/submissions',
    '/api/students/me/fees', '/api/students/me/report-cards', '/api/students/me/stats', '/api/students/me/achievements',
    '/api/students/me/dashboard', '/api/students/me/attendance', '/api/students/me/subjects', '/api/students/me/activities',
    '/api/students/me/documents', '/api/timetables', '/api/quizzes', '/api/assignments', '/api/resources',
    '/api/resources/courses', '/api/notifications', '/api/games', '/api/forum/topics', '/api/extracurriculars',
    '/api/calendar', '/api/notices',
  ];

  const PARENT: string[] = [
    '/api/parents/me', '/api/parents/me/children', '/api/parents/pta-meetings', '/api/parents/learning-resources',
    '/api/parents/messages', '/api/parents/notifications', '/api/parents/volunteering-opportunities',
    '/api/parents/complaints', '/api/parents/me/today-update', '/api/parents/savings/plans', '/api/parent-children',
    '/api/notifications', '/api/calendar', '/api/notices', '/api/community/surveys',
  ];

  const run = (role: string, id: string, branch: string | null, paths: string[]) => {
    describe(`${role} screens`, () => {
      it(`all ${paths.length} ${role} endpoints respond without a server error`, async () => {
        const failures: string[] = [];
        for (const p of paths) {
          const req = request(app).get(p).set('Authorization', `Bearer ${tok(id, role.toUpperCase(), branch)}`);
          if (branch) req.set('X-Branch-Id', branch);
          const res = await req;
          if (res.status >= 500) failures.push(`${p} -> ${res.status} ${JSON.stringify(res.body).slice(0, 80)}`);
        }
        if (failures.length) console.log(`\n${role} FAILING endpoints:\n` + failures.join('\n'));
        expect(failures).toEqual([]);
      }, 180000);
    });
  };

  run('Admin', U.admin, B, ADMIN);
  run('Teacher', U.teacher, B, TEACHER);
  run('Student', U.student, B, STUDENT);
  run('Parent', U.parent, B, PARENT);
});
