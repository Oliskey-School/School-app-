/**
 * BRANCH WRITE SCOPING (real database, via HTTP)
 *
 * Reproduces the reported bug: a school (main) admin who switches to a SUB-BRANCH
 * was bounced back to the main branch, so rows were never created in the sub-branch.
 *
 * Verifies:
 *  - a school-level admin (home = Main Branch) can act in ANY branch of their
 *    school, and a write lands in the ACTIVE (sub) branch — not main;
 *  - a branch admin (home = a sub-branch) stays locked to their branch and is
 *    rejected when trying to act in another branch;
 *  - rows created in a sub-branch are isolated from the main branch.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import prisma from '../../src/config/database';
import { config } from '../../src/config/env';

const S = 'bws-school';
const M = 'bws-main';      // main branch (is_main = true)
const B2 = 'bws-branch2';  // sub-branch (is_main = false)
const MAIN_ADMIN = 'bws-main-admin';
const BRANCH_ADMIN = 'bws-branch-admin';

const tok = (id: string, branch_id: string) => jwt.sign(
  { id, email: `${id}@x.com`, role: 'ADMIN', school_id: S, branch_id },
  config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });

const postNotice = (token: string, branchHeader: string, title: string) =>
  request(app).post('/api/notices')
    .set('Authorization', `Bearer ${token}`)
    .set('X-Branch-Id', branchHeader)
    .send({ title, content: 'Body', category: 'general', audience: ['all'] });

async function cleanup() {
  await (prisma as any).announcement.deleteMany({ where: { school_id: S } }).catch(() => {});
  for (const m of ['schoolMembership', 'user', 'branch'] as const) {
    await (prisma as any)[m].deleteMany({ where: { school_id: S } }).catch(() => {});
  }
  await prisma.school.delete({ where: { id: S } }).catch(() => {});
}

describe('Branch write scoping', () => {
  beforeAll(async () => {
    await cleanup();
    await prisma.school.create({ data: { id: S, name: 'BWS', code: 'BWS', slug: S, plan_type: 'enterprise', subscription_status: 'active' } });
    await prisma.branch.create({ data: { id: M, school_id: S, name: 'Main', code: 'MAIN', is_main: true } });
    await prisma.branch.create({ data: { id: B2, school_id: S, name: 'Annex', code: 'BRN2', is_main: false } });
    await prisma.user.create({ data: { id: MAIN_ADMIN, email: `${MAIN_ADMIN}@x.com`, password_hash: 'x', full_name: 'Main Admin', role: 'ADMIN' as any, school_id: S, branch_id: M, school_generated_id: 'BWS_MAIN_ADM_0001' } });
    await prisma.user.create({ data: { id: BRANCH_ADMIN, email: `${BRANCH_ADMIN}@x.com`, password_hash: 'x', full_name: 'Branch Admin', role: 'ADMIN' as any, school_id: S, branch_id: B2, school_generated_id: 'BWS_BRN2_ADM_0001' } });
  }, 120000);

  afterAll(cleanup, 120000);

  it('THE BUG: main admin acting in a sub-branch creates the row IN THE SUB-BRANCH', async () => {
    const res = await postNotice(tok(MAIN_ADMIN, M), B2, 'Sub-branch notice');
    if (res.status !== 201) console.log('main-admin in sub:', res.status, JSON.stringify(res.body).slice(0, 200));
    expect(res.status).toBe(201);
    const row = await (prisma as any).announcement.findFirst({ where: { school_id: S, title: 'Sub-branch notice' } });
    expect(row).toBeTruthy();
    expect(row.branch_id).toBe(B2);   // <-- was wrongly main (or rejected) before the fix
  });

  it('main admin acting in the main branch creates the row in the main branch', async () => {
    const res = await postNotice(tok(MAIN_ADMIN, M), M, 'Main-branch notice');
    expect(res.status).toBe(201);
    const row = await (prisma as any).announcement.findFirst({ where: { school_id: S, title: 'Main-branch notice' } });
    expect(row.branch_id).toBe(M);
  });

  it('a sub-branch row is isolated from the main branch', async () => {
    const mainScoped = await (prisma as any).announcement.findMany({ where: { school_id: S, branch_id: M } });
    expect(mainScoped.some((n: any) => n.title === 'Sub-branch notice')).toBe(false);
    const subScoped = await (prisma as any).announcement.findMany({ where: { school_id: S, branch_id: B2 } });
    expect(subScoped.some((n: any) => n.title === 'Sub-branch notice')).toBe(true);
  });

  it('a branch admin creates rows in THEIR branch', async () => {
    const res = await postNotice(tok(BRANCH_ADMIN, B2), B2, 'Branch admin notice');
    expect(res.status).toBe(201);
    const row = await (prisma as any).announcement.findFirst({ where: { school_id: S, title: 'Branch admin notice' } });
    expect(row.branch_id).toBe(B2);
  });

  it('a branch admin is BLOCKED from acting in another branch', async () => {
    const res = await postNotice(tok(BRANCH_ADMIN, B2), M, 'Should be blocked');
    expect(res.status).toBe(403);
    const row = await (prisma as any).announcement.findFirst({ where: { school_id: S, title: 'Should be blocked' } });
    expect(row).toBeNull();
  });
});
