/**
 * NEW BRANCH — ADMIN VIEWCOMPONENT AUDIT (real database)
 *
 * Seeds a Main branch full of data, then creates a brand-NEW branch via the real
 * createBranch flow. Acting as the main admin focused on the new branch, it:
 *   - hits every admin screen's endpoint and asserts NONE returns a server error
 *     (no failing button/page), AND
 *   - asserts NONE of Main's tagged data leaks into the new branch (born isolated),
 *   - confirms a create in the new branch persists with the NEW branch + its id and
 *     never appears back in Main.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import prisma from '../../src/config/database';
import { config } from '../../src/config/env';
import { SchoolService } from '../../src/services/school.service';
import { randomUUID } from 'crypto';

// API validation requires UUID-format school/branch ids, so use real UUIDs.
const S = randomUUID(), MAIN = randomUUID(), ADMIN = 'nba-admin';
const TAG = '__NBA_MAIN__';
let NEW = '';
// createBranch deliberately CLONES the class/subject structure (same names, new
// empty rows) into a new branch, so the admin doesn't rebuild them — these are not
// a data leak, so they're excluded from the "Main data must not appear" check.
const CLONED = ['/api/classes', '/api/subjects', '/api/academic/subjects'];

const tok = () => jwt.sign(
  { id: ADMIN, email: 'nba-admin@x.com', role: 'ADMIN', school_id: S, branch_id: null, allowed_branch_ids: [] },
  config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });
const get = (path: string, branch: string) =>
  request(app).get(path).set('Authorization', `Bearer ${tok()}`).set('X-Branch-Id', branch);
const post = (path: string, branch: string, body: any) =>
  request(app).post(path).set('Authorization', `Bearer ${tok()}`).set('X-Branch-Id', branch).send(body);

async function cleanup() {
  for (const m of ['studentFee', 'fee', 'behaviorNote', 'attendance', 'exam', 'timetable', 'announcement', 'event',
    'transportBus', 'studentEnrollment', 'student', 'teacher', 'class', 'subject', 'schoolMembership', 'user', 'branch'] as const) {
    await (prisma as any)[m]?.deleteMany?.({ where: { school_id: S } }).catch(() => {});
  }
  await prisma.school.delete({ where: { id: S } }).catch(() => {});
}

describe('New branch — admin viewComponent audit', () => {
  beforeAll(async () => {
    await cleanup();
    await prisma.school.create({ data: { id: S, name: 'NBA', code: 'NBA', slug: S, plan_type: 'enterprise', subscription_status: 'active' } });
    await prisma.branch.create({ data: { id: MAIN, school_id: S, name: 'Main', code: 'NBAM', is_main: true } });
    await prisma.user.create({ data: { id: ADMIN, email: 'nba-admin@x.com', password_hash: 'x', full_name: 'NBA Admin', role: 'ADMIN' as any, school_id: S, branch_id: null } });

    // Seed MAIN with a full, TAG-marked data set.
    const cls = await prisma.class.create({ data: { school_id: S, branch_id: MAIN, name: TAG, grade: 7, section: 'A' } });
    await prisma.subject.create({ data: { school_id: S, branch_id: MAIN, name: TAG } });
    const su = await prisma.user.create({ data: { id: 'nba-stu-u', email: 'nba-stu@x.com', password_hash: 'x', full_name: TAG, role: 'STUDENT' as any, school_id: S, branch_id: MAIN, school_generated_id: 'NBA_NBAM_STU_0001' } });
    const stu = await prisma.student.create({ data: { user_id: su.id, school_id: S, branch_id: MAIN, full_name: TAG, grade: 7, school_generated_id: 'NBA_NBAM_STU_0001' } });
    const tu = await prisma.user.create({ data: { id: 'nba-tch-u', email: 'nba-tch@x.com', password_hash: 'x', full_name: TAG, role: 'TEACHER' as any, school_id: S, branch_id: MAIN, school_generated_id: 'NBA_NBAM_TCH_0001' } });
    const tch = await prisma.teacher.create({ data: { user_id: tu.id, school_id: S, branch_id: MAIN, full_name: TAG, school_generated_id: 'NBA_NBAM_TCH_0001', subject_specialty: [], curriculum_eligibility: ['Nigerian'] } });
    await prisma.announcement.create({ data: { school_id: S, branch_id: MAIN, title: TAG, content: 'x', category: 'General', audience: ['all'] } });
    await prisma.event.create({ data: { school_id: S, branch_id: MAIN, title: TAG, date: new Date(), type: 'General' } });
    await prisma.transportBus.create({ data: { school_id: S, branch_id: MAIN, name: TAG, capacity: 10 } });
    await prisma.exam.create({ data: { school_id: S, branch_id: MAIN, title: TAG, subject: TAG } });
    await prisma.studentFee.create({ data: { student_id: stu.id, school_id: S, branch_id: MAIN, title: TAG, amount: 100, due_date: new Date() } as any });
    await prisma.behaviorNote.create({ data: { student_id: stu.id, teacher_id: tch.id, school_id: S, branch_id: MAIN, note: TAG, category: 'General' } });
    await prisma.attendance.create({ data: { student_id: stu.id, class_id: cls.id, date: new Date(), status: TAG, school_id: S, branch_id: MAIN } });
    await prisma.timetable.create({ data: { school_id: S, branch_id: MAIN, subject: TAG, start_time: '08:00', end_time: '09:00', class_name: TAG, day_of_week: 1 } as any });

    // Create the NEW branch through the real flow.
    const created: any = await SchoolService.createBranch(S, { name: 'New Campus', code: 'NEWB' });
    NEW = created.id || created.branch?.id;
  }, 120000);

  afterAll(cleanup, 120000);

  // Every admin screen's data endpoint.
  const ADMIN_ENDPOINTS: string[] = [
    '/api/students', '/api/teachers', '/api/parents', '/api/classes', '/api/subjects', '/api/users',
    '/api/notices', '/api/calendar', '/api/attendance', '/api/fees', '/api/fees/analytics', '/api/exams',
    '/api/timetables', '/api/quizzes', '/api/lesson-plans', '/api/report-cards', '/api/assignments',
    '/api/behavior/notes', '/api/buses', '/api/dashboard/stats', '/api/branches', '/api/branches/authorized',
    '/api/academic/performance', '/api/academic/subjects', '/api/payroll/payslips', '/api/payroll/transactions',
    '/api/payroll/leave-requests', '/api/payroll/arrears', '/api/transport/routes', '/api/transport/stops',
    '/api/hostels', '/api/hostels/rooms', '/api/infrastructure/facilities', '/api/infrastructure/assets',
    '/api/inspections', '/api/governance/compliance', '/api/health', '/api/gallery', '/api/community/surveys',
    '/api/extracurriculars', '/api/conferences', '/api/counseling', '/api/maintenance', '/api/store/products',
    '/api/vendors', '/api/id-cards', '/api/audit-logs', '/api/notifications', '/api/forum/topics',
    '/api/resources', '/api/pd/courses', '/api/policy/policies', '/api/payment-plans', '/api/analytics',
    '/api/admin-hub/reports/saved', '/api/admin-hub/invoices', '/api/admin-hub/sessions', '/api/admin-hub/config',
    '/api/emergency/history', '/api/chat/rooms', '/api/school-documents', '/api/teacher-salaries',
    '/api/compliance-checklists', '/api/transactions', '/api/transport/assignments',
  ];

  it('NEW branch: every admin endpoint responds without a server error', async () => {
    const failures: string[] = [];
    for (const p of ADMIN_ENDPOINTS) {
      const res = await get(p, NEW);
      if (res.status >= 500) failures.push(`${p} -> ${res.status} ${JSON.stringify(res.body).slice(0, 80)}`);
    }
    if (failures.length) console.log('NEW-branch failing admin endpoints:\n' + failures.join('\n'));
    expect(failures).toEqual([]);
  }, 180000);

  it('NEW branch is born ISOLATED: none of Main\'s data leaks into it', async () => {
    const leaks: string[] = [];
    for (const p of ADMIN_ENDPOINTS) {
      if (CLONED.includes(p)) continue; // class/subject structure is intentionally cloned
      const res = await get(p, NEW);
      if (JSON.stringify(res.body ?? '').includes(TAG)) leaks.push(`${p}`);
    }
    if (leaks.length) console.log('NEW-branch endpoints LEAKING Main data:\n' + leaks.join('\n'));
    expect(leaks).toEqual([]);
  }, 180000);

  it('cloned classes/subjects are SEPARATE rows (Main + NEW each own a copy)', async () => {
    const classes = await prisma.class.findMany({ where: { school_id: S, name: TAG }, select: { branch_id: true } });
    const branches = new Set(classes.map(c => c.branch_id));
    expect(branches.has(MAIN)).toBe(true);  // Main keeps its own row
    expect(branches.has(NEW)).toBe(true);   // NEW has its OWN cloned row (not shared)
  });

  it('NEW branch starts empty (no students inherited from Main)', async () => {
    const res = await get('/api/students', NEW);
    const arr = Array.isArray(res.body) ? res.body : (res.body?.data || res.body?.students || []);
    expect(arr.length).toBe(0);
  });

  it('creating in the NEW branch persists there with the NEW branch id, invisible in Main', async () => {
    const email = `nba.new.${Date.now()}@student.school.com`;
    const res = await post('/api/students/enroll', NEW, { firstName: 'New', lastName: 'Campus', email, grade: 7, branch_id: NEW });
    if (![200, 201].includes(res.status)) console.log('enroll failed:', res.status, JSON.stringify(res.body));
    expect([200, 201]).toContain(res.status);
    const u = await prisma.user.findFirst({ where: { email }, select: { branch_id: true, school_generated_id: true } });
    expect(u?.branch_id).toBe(NEW);                          // stored in the new branch
    expect(u?.school_generated_id).toContain('_NEWB_');      // carries the new branch code
    // not visible from Main
    const inMain = await get('/api/students', MAIN);
    const mainArr = Array.isArray(inMain.body) ? inMain.body : (inMain.body?.data || inMain.body?.students || []);
    expect(mainArr.map((s: any) => s.school_generated_id)).not.toContain(u?.school_generated_id);
  });
});
