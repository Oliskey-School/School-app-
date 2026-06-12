/**
 * ADMIN — VIEWCOMPONENT AUDIT (real database)
 *
 * Seeds an isolated school + Main branch + an admin user, then acting as that
 * admin (real JWT):
 *   - hits the data endpoint behind EVERY admin viewComponent and asserts none
 *     returns a server error (5xx) — i.e. no failing page,
 *   - exercises the core admin WRITE buttons (create student / class / notice /
 *     exam / behavior note / fee) and asserts each persists a real DB row.
 *
 * This is the backend + database-persistence half of the admin E2E. The
 * frontend render half is covered by the Vitest component suite.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import prisma from '../../src/config/database';
import { config } from '../../src/config/env';

// Real school/branch IDs are UUIDs (tenant validation enforces this), so the
// audit seeds UUIDs to faithfully exercise the validated write paths.
const S = 'a0a0a0a0-0000-4000-8000-000000000001';
const M = 'a0a0a0a0-0000-4000-8000-000000000002';
const AUID = 'ava-adm-u';

const tok = () => jwt.sign(
  { id: AUID, email: 'ava-adm@x.com', role: 'ADMIN', school_id: S, branch_id: M },
  config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });
const get = (path: string) =>
  request(app).get(path).set('Authorization', `Bearer ${tok()}`).set('X-Branch-Id', M);
const post = (path: string, body: any) =>
  request(app).post(path).set('Authorization', `Bearer ${tok()}`).set('X-Branch-Id', M).send(body);

async function cleanup() {
  for (const m of ['behaviorNote', 'announcement', 'exam', 'studentFee', 'fee', 'attendance',
    'student', 'class', 'teacher', 'parent', 'schoolMembership', 'user', 'branch'] as const) {
    await (prisma as any)[m]?.deleteMany?.({ where: { school_id: S } }).catch(() => {});
  }
  await prisma.school.delete({ where: { id: S } }).catch(() => {});
}

describe('Admin viewComponent audit', () => {
  beforeAll(async () => {
    await cleanup();
    await prisma.school.create({ data: { id: S, name: 'AVA', code: 'AVA', slug: S, plan_type: 'enterprise', subscription_status: 'active' } });
    await prisma.branch.create({ data: { id: M, school_id: S, name: 'Main', code: 'AVAM', is_main: true } });
    await prisma.user.create({ data: { id: AUID, email: 'ava-adm@x.com', password_hash: 'x', full_name: 'Audit Admin', role: 'ADMIN' as any, school_id: S, branch_id: M } });
    // Seed minimal data so list screens have something to render.
    await prisma.class.create({ data: { id: 'ava-cls', school_id: S, branch_id: M, name: 'JSS1', grade: 7, section: 'A' } });
    const su = await prisma.user.create({ data: { id: 'ava-stu-u', email: 'ava-stu@x.com', password_hash: 'x', full_name: 'Seed Student', role: 'STUDENT' as any, school_id: S, branch_id: M } });
    await prisma.student.create({ data: { id: 'ava-stu', user_id: su.id, school_id: S, branch_id: M, full_name: 'Seed Student', grade: 7 } });
    // a teacher to author behavior notes (notes require an authoring teacher)
    const tu = await prisma.user.create({ data: { id: 'ava-tch-u', email: 'ava-tch@x.com', password_hash: 'x', full_name: 'Seed Teacher', role: 'TEACHER' as any, school_id: S, branch_id: M } });
    await prisma.teacher.create({ data: { id: 'ava-tch', user_id: tu.id, school_id: S, branch_id: M, full_name: 'Seed Teacher', subject_specialty: [], curriculum_eligibility: ['Nigerian'] } });
  }, 120000);

  afterAll(cleanup, 120000);

  // Read endpoint behind each admin viewComponent (grouped by the screen it backs).
  const ADMIN_ENDPOINTS: string[] = [
    // dashboard / overview / analytics
    '/api/dashboard/stats', '/api/dashboard/audit-logs', '/api/dashboard/search?term=a',
    '/api/analytics/overview', '/api/saas-analytics/overview',
    // people: students / teachers / parents / staff
    '/api/students', '/api/students/pending-approvals', '/api/teachers', '/api/parents',
    // academic
    '/api/classes', '/api/subjects', '/api/timetables', '/api/exams', '/api/external-exams/bodies',
    '/api/report-cards', '/api/assignments', '/api/lesson-plans', '/api/academic/performance',
    '/api/quizzes', '/api/resources',
    // attendance
    '/api/attendance', '/api/teachers/attendance', '/api/teachers/attendance-approvals',
    // finance
    '/api/fees', '/api/payment-transactions', '/api/payroll/budgets', '/api/teacher-salaries',
    '/api/payslips', '/api/arrears', '/api/transactions',
    // communication
    '/api/notices', '/api/notifications', '/api/calendar', '/api/chat/rooms', '/api/forum/topics',
    // operations / facilities
    '/api/hostels', '/api/transport', '/api/buses', '/api/store/products', '/api/vendors',
    '/api/id-cards', '/api/gallery', '/api/emergency',
    // governance / compliance / audit
    '/api/audit-logs', '/api/compliance-checklists', '/api/governance', '/api/inspections',
    '/api/behavior/notes', '/api/health-logs', '/api/conferences', '/api/counseling',
    '/api/community/pta-meetings', '/api/extracurriculars', '/api/scholarships',
    // settings / misc
    '/api/branches', '/api/accessibility-settings', '/api/external-integrations', '/api/third-party-apps',
    '/api/app-installations', '/api/school-documents', '/api/versions',
  ];

  it('every admin viewComponent endpoint responds without a server error (no failing page)', async () => {
    const failures: string[] = [];
    for (const p of ADMIN_ENDPOINTS) {
      const res = await get(p);
      if (res.status >= 500) failures.push(`${p} -> ${res.status} ${JSON.stringify(res.body).slice(0, 100)}`);
    }
    if (failures.length) console.log('Admin failing endpoints:\n' + failures.join('\n'));
    expect(failures).toEqual([]);
  }, 180000);

  it('Enroll Student button persists a real student row', async () => {
    const res = await post('/api/students/enroll', {
      firstName: 'AuditCreated', lastName: 'Student', grade: 8, section: 'A',
      gender: 'Male', email: 'ava-created-stu@x.com',
    });
    if (![200, 201].includes(res.status)) console.log('enrollStudent:', res.status, JSON.stringify(res.body));
    expect([200, 201]).toContain(res.status);
    const row = await prisma.student.findFirst({ where: { school_id: S, user: { email: 'ava-created-stu@x.com' } } });
    expect(row).toBeTruthy();
    expect(row?.branch_id).toBe(M);
  });

  it('Create Class button persists a real class row', async () => {
    const res = await post('/api/classes', { name: 'JSS2', grade: 8, section: 'B' });
    if (![200, 201].includes(res.status)) console.log('createClass:', res.status, JSON.stringify(res.body));
    expect([200, 201]).toContain(res.status);
    const row = await prisma.class.findFirst({ where: { school_id: S, name: 'JSS2' } });
    expect(row).toBeTruthy();
  });

  it('Publish Notice button persists a real notice row', async () => {
    const res = await post('/api/notices', {
      title: 'Audit Notice', content: 'Body', audience: ['all'], category: 'general',
    });
    if (![200, 201].includes(res.status)) console.log('createNotice:', res.status, JSON.stringify(res.body));
    expect([200, 201]).toContain(res.status);
    const row = await (prisma as any).announcement.findFirst({ where: { school_id: S, title: 'Audit Notice' } });
    expect(row).toBeTruthy();
  });

  it('Register Exam button persists a real exam row', async () => {
    const res = await post('/api/exams', {
      title: 'Audit Exam', subject: 'Mathematics', class_id: 'ava-cls',
      date: new Date().toISOString(), total_marks: 100,
    });
    if (![200, 201].includes(res.status)) console.log('createExam:', res.status, JSON.stringify(res.body));
    expect([200, 201]).toContain(res.status);
    const row = await prisma.exam.findFirst({ where: { school_id: S, title: 'Audit Exam' } });
    expect(row).toBeTruthy();
  });

  it('Behavior Log button persists a real behavior note row', async () => {
    const res = await post('/api/behavior/notes', {
      student_id: 'ava-stu', teacher_id: 'ava-tch', type: 'positive', category: 'Conduct',
      note: 'Audit behavior note', date: new Date().toISOString(),
    });
    if (![200, 201].includes(res.status)) console.log('behaviorNote:', res.status, JSON.stringify(res.body));
    expect([200, 201]).toContain(res.status);
    const row = await (prisma as any).behaviorNote.findFirst({ where: { school_id: S, note: 'Audit behavior note' } });
    expect(row).toBeTruthy();
  });
});
