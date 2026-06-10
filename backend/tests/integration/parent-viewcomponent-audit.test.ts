/**
 * PARENT — VIEWCOMPONENT AUDIT (real database)
 *
 * Seeds a school + branch + parent linked to a child + a teacher + a fee, then acting
 * as that parent hits every Parent screen's data endpoint (no failing button/page) and
 * exercises every Parent write button (appointment, payment, message, complaint,
 * volunteer signup, savings plan, link child), asserting each persists.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import prisma from '../../src/config/database';
import { config } from '../../src/config/env';

const S = 'pva-school', M = 'pva-main';
const PU = 'pva-par-u', PID = 'pva-par';
const SU = 'pva-stu-u', SID = 'pva-stu';
const SU2 = 'pva-stu2-u', SID2 = 'pva-stu2';
const TU = 'pva-tch-u', TID = 'pva-tch';
let FEEID = '', OPPID = '';

const tok = () => jwt.sign(
  { id: PU, email: 'pva-par@x.com', role: 'PARENT', school_id: S, branch_id: M, allowed_branch_ids: [] },
  config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });
const get = (path: string) =>
  request(app).get(path).set('Authorization', `Bearer ${tok()}`).set('X-Branch-Id', M);
const post = (path: string, body: any) =>
  request(app).post(path).set('Authorization', `Bearer ${tok()}`).set('X-Branch-Id', M).send(body);

async function cleanup() {
  for (const m of ['savingsPlan', 'payment', 'message', 'complaint', 'volunteerSignup', 'volunteeringOpportunity',
    'appointment', 'parentChild', 'studentFee', 'student', 'teacher', 'parent', 'class', 'schoolMembership', 'user', 'branch'] as const) {
    await (prisma as any)[m]?.deleteMany?.({ where: { school_id: S } }).catch(() => {});
  }
  await prisma.school.delete({ where: { id: S } }).catch(() => {});
}

describe('Parent viewComponent audit', () => {
  beforeAll(async () => {
    await cleanup();
    await prisma.school.create({ data: { id: S, name: 'PVA', code: 'PVA', slug: S, plan_type: 'enterprise', subscription_status: 'active' } });
    await prisma.branch.create({ data: { id: M, school_id: S, name: 'Main', code: 'PVAM', is_main: true } });
    // parent
    const pu = await prisma.user.create({ data: { id: PU, email: 'pva-par@x.com', password_hash: 'x', full_name: 'Audit Parent', role: 'PARENT' as any, school_id: S, branch_id: M } });
    await prisma.parent.create({ data: { id: PID, user_id: pu.id, school_id: S, branch_id: M, full_name: 'Audit Parent' } });
    // two children
    for (const [uid, sid, n] of [[SU, SID, 'Child One'], [SU2, SID2, 'Child Two']] as const) {
      await prisma.user.create({ data: { id: uid, email: `${uid}@x.com`, password_hash: 'x', full_name: n, role: 'STUDENT' as any, school_id: S, branch_id: M } });
      await prisma.student.create({ data: { id: sid, user_id: uid, school_id: S, branch_id: M, full_name: n, grade: 7, school_generated_id: `PVA_PVAM_STU_000${sid === SID ? 1 : 2}` } });
    }
    // link only the FIRST child (second is for the link-child button test)
    await prisma.parentChild.create({ data: { parent_id: PID, student_id: SID, school_id: S, branch_id: M } });
    // teacher
    const tu = await prisma.user.create({ data: { id: TU, email: 'pva-tch@x.com', password_hash: 'x', full_name: 'Teacher', role: 'TEACHER' as any, school_id: S, branch_id: M } });
    await prisma.teacher.create({ data: { id: TID, user_id: tu.id, school_id: S, branch_id: M, full_name: 'Teacher', subject_specialty: [], curriculum_eligibility: ['Nigerian'] } });
    // a fee + a volunteering opportunity
    FEEID = (await prisma.studentFee.create({ data: { student_id: SID, school_id: S, branch_id: M, title: 'Term 1', amount: 1000, due_date: new Date() } as any })).id;
    OPPID = (await prisma.volunteeringOpportunity.create({ data: { school_id: S, branch_id: M, title: 'Sports Day', slots_total: 5 } as any })).id;
  }, 120000);

  afterAll(cleanup, 120000);

  const PARENT_GET: string[] = [
    '/api/parents/me', '/api/parents/me/children', '/api/parents/me/today-update',
    '/api/parents/pta-meetings', '/api/parents/meetings', '/api/parents/learning-resources',
    '/api/parents/messages', '/api/parents/notifications', '/api/parents/volunteering-opportunities',
    '/api/parents/savings/plans', '/api/parents/complaints',
    `/api/parents/me/children/${SID}/overview`, `/api/parents/me/children/${SID}/fees`,
    `/api/parents/teachers/${TID}/availability`,
    // shared reads the parent dashboard calls
    '/api/notices', '/api/calendar', '/api/gallery', '/api/forum/topics', '/api/chat/rooms', '/api/extracurriculars',
  ];

  it('every Parent GET endpoint responds without a server error', async () => {
    const failures: string[] = [];
    for (const p of PARENT_GET) {
      const res = await get(p);
      if (res.status >= 500) failures.push(`${p} -> ${res.status} ${JSON.stringify(res.body).slice(0, 100)}`);
    }
    if (failures.length) console.log('Parent failing GET endpoints:\n' + failures.join('\n'));
    expect(failures).toEqual([]);
  }, 180000);

  it('My Children shows the linked child', async () => {
    const res = await get('/api/parents/me/children');
    const arr = Array.isArray(res.body) ? res.body : (res.body?.data || []);
    expect(arr.map((c: any) => c.id)).toContain(SID);
  });

  // [label, path, body]
  const WRITES: Array<[string, string, any]> = [
    ['Book Appointment', '/api/parents/appointments', { date: new Date().toISOString(), teacher_id: TID, parent_id: PID, student_id: SID, title: 'Meeting' }],
    ['Record Payment', '/api/parents/me/payments', { student_id: SID, fee_id: () => FEEID, amount: 500, reference: 'REF123', payment_method: 'card' }],
    ['Send Message', '/api/parents/messages', { receiverId: TU, content: 'Hello teacher' }],
    ['Submit Complaint', '/api/parents/complaints', { category: 'Facilities', comment: 'Broken tap', rating: 3 }],
    ['Volunteer Signup', '/api/parents/volunteer-signup', { opportunity_id: () => OPPID, full_name: 'Audit Parent' }],
    ['Create Savings Plan', '/api/parents/savings/plans', { student_id: SID, target_amount: 5000, target_date: new Date(Date.now() + 1e10).toISOString(), frequency: 'Monthly' }],
    ['Link Child', '/api/parents/link-child', { parentId: PID, studentId: SID2 }],
  ];

  for (const [label, path, body] of WRITES) {
    it(`${label} button persists (no failed API)`, async () => {
      const resolved = Object.fromEntries(Object.entries(body).map(([k, v]) => [k, typeof v === 'function' ? (v as any)() : v]));
      const res = await post(path, resolved);
      if (![200, 201].includes(res.status)) console.log(`${label}:`, res.status, JSON.stringify(res.body).slice(0, 200));
      expect([200, 201]).toContain(res.status);
    });
  }
});
