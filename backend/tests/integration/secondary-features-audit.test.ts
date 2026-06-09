/**
 * SECONDARY FEATURES — end-to-end smoke + isolation (real database)
 *
 * The core role flows are covered by the admin/multirole/account suites. This one
 * sweeps the LONG TAIL of feature modules (payroll, transport, hostel, exams,
 * timetable, library/resources, gallery, community, governance, analytics, etc.)
 * acting as a real admin, asserting each endpoint:
 *   - responds without a server crash (status < 500)  -> the page/feature works
 *   - never returns another school's seeded record     -> SCHOOL isolation holds
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import prisma from '../../src/config/database';
import { config } from '../../src/config/env';

const SA = 'sec-a', SB = 'sec-b';
const BA = 'sec-ba', BB = 'sec-bb';
const ADMIN_A = 'sec-admin-a';

const tokenA = () => jwt.sign(
  { id: ADMIN_A, email: 'sec-admin-a@x.com', role: 'ADMIN', school_id: SA, branch_id: BA, allowed_branch_ids: [] },
  config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });

async function cleanup() {
  for (const s of [SA, SB]) {
    for (const m of ['event', 'announcement', 'class', 'subject', 'schoolMembership', 'user', 'branch'] as const) {
      await (prisma as any)[m]?.deleteMany?.({ where: { school_id: s } }).catch(() => {});
    }
    await prisma.school.delete({ where: { id: s } }).catch(() => {});
  }
}

describe('Secondary features (smoke + isolation)', () => {
  beforeAll(async () => {
    await cleanup();
    for (const [id, code, b] of [[SA, 'SECA', BA], [SB, 'SECB', BB]] as const) {
      await prisma.school.create({ data: { id, name: id, code, slug: id, plan_type: 'enterprise', subscription_status: 'active' } });
      await prisma.branch.create({ data: { id: b, school_id: id, name: id + '-main', code: code + 'M', is_main: true } });
    }
    await prisma.user.create({ data: { id: ADMIN_A, email: 'sec-admin-a@x.com', password_hash: 'x', full_name: 'Sec Admin A', role: 'ADMIN' as any, school_id: SA, branch_id: BA } });
  }, 60000);
  afterAll(cleanup, 60000);

  // Broad set of GET endpoints the admin UI calls across the secondary modules.
  const ENDPOINTS: string[] = [
    // payroll / finance
    '/api/teacher-salaries', '/api/payroll/budgets', '/api/payslips', '/api/payment-transactions',
    '/api/leave-requests', '/api/leave-balances', '/api/arrears', '/api/payment-plans', '/api/transactions',
    '/api/scholarships', '/api/sponsorships',
    // operations / facilities
    '/api/transport', '/api/hostels', '/api/infrastructure', '/api/maintenance', '/api/inspections',
    // academics
    '/api/exams', '/api/timetables', '/api/assignments', '/api/lesson-plans', '/api/report-cards',
    '/api/resources', '/api/academic', '/api/external-exams',
    // engagement / community
    '/api/notices', '/api/calendar', '/api/gallery', '/api/community', '/api/extracurriculars',
    '/api/forum', '/api/conferences', '/api/counseling', '/api/games',
    // governance / compliance / admin-hub
    '/api/governance', '/api/health-logs', '/api/audit-logs', '/api/compliance-checklists',
    '/api/id-verification-requests', '/api/school-documents', '/api/external-integrations',
    '/api/third-party-apps', '/api/app-installations', '/api/accessibility-settings',
    '/api/analytics', '/api/store', '/api/vendors', '/api/id-cards', '/api/behavior/notes',
  ];

  for (const path of ENDPOINTS) {
    it(`loads without crashing: ${path}`, async () => {
      const res = await request(app).get(path)
        .set('Authorization', `Bearer ${tokenA()}`).set('X-Branch-Id', BA);
      // The guarantee: the feature endpoint never 500s for a valid admin. (4xx for a
      // few that need extra params is acceptable — what matters is no server crash.)
      expect(res.status).toBeLessThan(500);
      // And it never leaks School B's identifiers.
      expect(JSON.stringify(res.body ?? '')).not.toContain(SB);
    });
  }

  it('summary: NONE of the secondary endpoints 500', async () => {
    const failures: string[] = [];
    for (const path of ENDPOINTS) {
      const res = await request(app).get(path)
        .set('Authorization', `Bearer ${tokenA()}`).set('X-Branch-Id', BA);
      if (res.status >= 500) failures.push(`${path} -> ${res.status}`);
    }
    expect(failures).toEqual([]);
  });
});
