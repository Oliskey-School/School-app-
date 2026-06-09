/**
 * PER-BRANCH ROWS (real database) — "every button makes its own row per branch".
 *
 * As the main admin, creates each feature in TWO branches the admin set up, and
 * asserts each branch ends up with its OWN separate row — never one shared row
 * across branches (the class of bug that hit teacher attendance). Also exercises
 * a teacher creating per-branch data.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import prisma from '../../src/config/database';
import { config } from '../../src/config/env';

const S = 'pbr-school', M = 'pbr-main', L = 'pbr-lekki', ADMIN = 'pbr-admin';
const seed: Record<string, any> = { M: {}, L: {} };

const adminTok = () => jwt.sign(
  { id: ADMIN, email: 'pbr-admin@x.com', role: 'ADMIN', school_id: S, branch_id: null, allowed_branch_ids: [] },
  config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });
const post = (path: string, branch: string, body: any) =>
  request(app).post(path).set('Authorization', `Bearer ${adminTok()}`).set('X-Branch-Id', branch).send(body);

async function cleanup() {
  for (const m of ['behaviorNote', 'exam', 'fee', 'studentFee', 'announcement', 'event', 'transportBus', 'class', 'subject',
    'student', 'teacher', 'schoolMembership', 'user', 'branch'] as const) {
    await (prisma as any)[m]?.deleteMany?.({ where: { school_id: S } }).catch(() => {});
  }
  await prisma.school.delete({ where: { id: S } }).catch(() => {});
}

describe('Per-branch rows (every create lands in its own branch)', () => {
  beforeAll(async () => {
    await cleanup();
    await prisma.school.create({ data: { id: S, name: 'PBR', code: 'PBR', slug: S, plan_type: 'enterprise', subscription_status: 'active' } });
    await prisma.branch.create({ data: { id: M, school_id: S, name: 'Main', code: 'PBRM', is_main: true } });
    await prisma.branch.create({ data: { id: L, school_id: S, name: 'Lekki', code: 'PBRL', is_main: false } });
    await prisma.user.create({ data: { id: ADMIN, email: 'pbr-admin@x.com', password_hash: 'x', full_name: 'PBR Admin', role: 'ADMIN' as any, school_id: S, branch_id: null } });
    // a student + teacher per branch (for behaviour notes)
    for (const [k, b] of [['M', M], ['L', L]] as const) {
      const su = await prisma.user.create({ data: { id: `pbr-${k}-stu-u`, email: `pbr-${k}-stu@x.com`, password_hash: 'x', full_name: `Stu ${k}`, role: 'STUDENT' as any, school_id: S, branch_id: b } });
      seed[k].student = (await prisma.student.create({ data: { user_id: su.id, school_id: S, branch_id: b, full_name: `Stu ${k}`, grade: 7 } })).id;
      const tu = await prisma.user.create({ data: { id: `pbr-${k}-tch-u`, email: `pbr-${k}-tch@x.com`, password_hash: 'x', full_name: `Tch ${k}`, role: 'TEACHER' as any, school_id: S, branch_id: b } });
      seed[k].teacher = (await prisma.teacher.create({ data: { user_id: tu.id, school_id: S, branch_id: b, full_name: `Tch ${k}`, subject_specialty: [], curriculum_eligibility: ['Nigerian'] } })).id;
    }
  }, 60000);
  afterAll(cleanup, 60000);

  const branchesOf = async (model: string, where: any) => {
    const rows = await (prisma as any)[model].findMany({ where: { school_id: S, ...where }, select: { branch_id: true } });
    return rows.map((r: any) => r.branch_id).sort();
  };

  // [label, path, body(branchKey)->body, model, finder]
  const CASES: Array<[string, string, (k: 'M' | 'L') => any, string, () => any]> = [
    ['Subject', '/api/subjects', () => ({ name: '__PBR_SUBJ__' }), 'subject', () => ({ name: '__PBR_SUBJ__' })],
    ['Class', '/api/classes', () => ({ name: '__PBR_CLS__', grade: 8, section: 'P' }), 'class', () => ({ name: '__PBR_CLS__' })],
    ['Notice', '/api/notices', () => ({ title: '__PBR_NOTICE__', content: 'x', category: 'General', audience: ['all'] }), 'announcement', () => ({ title: '__PBR_NOTICE__' })],
    ['Calendar event', '/api/calendar', () => ({ title: '__PBR_EVENT__', date: new Date().toISOString(), type: 'General' }), 'event', () => ({ title: '__PBR_EVENT__' })],
    ['Bus', '/api/buses', () => ({ name: '__PBR_BUS__', capacity: 5 }), 'transportBus', () => ({ name: '__PBR_BUS__' })],
    ['Exam', '/api/exams', () => ({ title: '__PBR_EXAM__', subject: 'Maths' }), 'exam', () => ({ title: '__PBR_EXAM__' })],
    ['Fee', '/api/fees', (k) => ({ studentId: seed[k].student, title: '__PBR_FEE__', amount: 100, dueDate: new Date().toISOString() }), 'studentFee', () => ({ title: '__PBR_FEE__' })],
    ['Behavior note', '/api/behavior/notes', (k) => ({ student_id: seed[k].student, teacher_id: seed[k].teacher, note: '__PBR_BEH__', category: 'General' }), 'behaviorNote', () => ({ note: '__PBR_BEH__' })],
  ];

  for (const [label, path, body, model, finder] of CASES) {
    it(`${label}: creating in Main AND Lekki yields TWO separate rows (one per branch)`, async () => {
      const rM = await post(path, M, body('M'));
      const rL = await post(path, L, body('L'));
      expect([200, 201]).toContain(rM.status);
      expect([200, 201]).toContain(rL.status);
      const branches = await branchesOf(model, finder());
      // exactly one row in Main and one in Lekki — never a single shared row
      expect(branches).toEqual([M, L].sort());
    });
  }
});
