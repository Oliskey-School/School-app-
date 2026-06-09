/**
 * STUDENT — VIEWCOMPONENT AUDIT (real database)
 *
 * Seeds a school + branch + a student, then acting as that student (token scoped to
 * their branch) hits every Student screen's data endpoint (no failing button/page)
 * and exercises the student write button (upload document), asserting it persists.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import prisma from '../../src/config/database';
import { config } from '../../src/config/env';

const S = 'sva-school', M = 'sva-main';
const SUID = 'sva-stu-u', SID = 'sva-stu';

const tok = () => jwt.sign(
  { id: SUID, email: 'sva-stu@x.com', role: 'STUDENT', school_id: S, branch_id: M, allowed_branch_ids: [] },
  config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });
const get = (path: string) =>
  request(app).get(path).set('Authorization', `Bearer ${tok()}`).set('X-Branch-Id', M);
const post = (path: string, body: any) =>
  request(app).post(path).set('Authorization', `Bearer ${tok()}`).set('X-Branch-Id', M).send(body);

async function cleanup() {
  for (const m of ['studentDocument', 'studentEnrollment', 'student', 'class', 'schoolMembership', 'user', 'branch'] as const) {
    await (prisma as any)[m]?.deleteMany?.({ where: { school_id: S } }).catch(() => {});
  }
  await prisma.school.delete({ where: { id: S } }).catch(() => {});
}

describe('Student viewComponent audit', () => {
  beforeAll(async () => {
    await cleanup();
    await prisma.school.create({ data: { id: S, name: 'SVA', code: 'SVA', slug: S, plan_type: 'enterprise', subscription_status: 'active' } });
    await prisma.branch.create({ data: { id: M, school_id: S, name: 'Main', code: 'SVAM', is_main: true } });
    const cls = await prisma.class.create({ data: { school_id: S, branch_id: M, name: 'JSS1', grade: 7, section: 'A' } });
    const u = await prisma.user.create({ data: { id: SUID, email: 'sva-stu@x.com', password_hash: 'x', full_name: 'Audit Student', role: 'STUDENT' as any, school_id: S, branch_id: M, school_generated_id: 'SVA_SVAM_STU_0001' } });
    await prisma.student.create({ data: { id: SID, user_id: u.id, school_id: S, branch_id: M, full_name: 'Audit Student', grade: 7, school_generated_id: 'SVA_SVAM_STU_0001', assigned_subjects: ['Mathematics', 'English'] } });
    await prisma.studentEnrollment.create({ data: { student_id: SID, class_id: cls.id, school_id: S, branch_id: M } as any }).catch(() => {});
  }, 120000);

  afterAll(cleanup, 120000);

  const STUDENT_ENDPOINTS: string[] = [
    '/api/students/me', '/api/students/me/performance', '/api/students/me/quiz-results',
    '/api/students/me/submissions', '/api/students/me/fees', '/api/students/me/report-cards',
    '/api/students/me/stats', '/api/students/me/achievements', '/api/students/me/dashboard',
    '/api/students/me/attendance', '/api/students/me/subjects', '/api/students/me/activities',
    '/api/students/me/extracurriculars', '/api/students/me/documents',
    // shared reads the student dashboard calls
    '/api/notices', '/api/calendar', '/api/timetables', '/api/assignments', '/api/quizzes',
    '/api/exams', '/api/resources', '/api/notifications', '/api/gallery', '/api/forum/topics',
    '/api/chat/rooms',
  ];

  it('every Student endpoint responds without a server error', async () => {
    const failures: string[] = [];
    for (const p of STUDENT_ENDPOINTS) {
      const res = await get(p);
      if (res.status >= 500) failures.push(`${p} -> ${res.status} ${JSON.stringify(res.body).slice(0, 100)}`);
    }
    if (failures.length) console.log('Student failing endpoints:\n' + failures.join('\n'));
    expect(failures).toEqual([]);
  }, 180000);

  it('My Subjects reflects the per-student assignment (authoritative)', async () => {
    const res = await get('/api/students/me/subjects');
    const arr = Array.isArray(res.body) ? res.body : (res.body?.data || []);
    const names = arr.map((s: any) => s.name || s);
    expect(names).toEqual(expect.arrayContaining(['Mathematics', 'English']));
  });

  it('upload-document button persists a real row in the database', async () => {
    const res = await post('/api/students/me/documents', { name: 'Report.pdf', url: 'https://x/y.pdf', type: 'pdf', size: 1024 });
    if (![200, 201].includes(res.status)) console.log('document:', res.status, JSON.stringify(res.body));
    expect([200, 201]).toContain(res.status);
    const rows = await (prisma as any).studentDocument.findMany({ where: { student_id: SID } });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].school_id).toBe(S);
  });
});
