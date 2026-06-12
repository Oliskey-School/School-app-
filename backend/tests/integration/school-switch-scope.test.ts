/**
 * SCHOOL SWITCH SCOPING (real database)
 *
 * Reproduces the reported bug: switching to another school bounced back to the
 * "main" school and rows were not scoped to the school being worked in.
 *
 * Verifies:
 *  - switching to a school the user belongs to re-scopes the session to THAT
 *    school AND realigns branch_id to that school's branch (not the old one);
 *  - a SUPER_ADMIN (platform operator) can switch into any school;
 *  - a non-member, non-super-admin is rejected (strict isolation preserved).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import jwt from 'jsonwebtoken';
import prisma from '../../src/config/database';
import { config } from '../../src/config/env';
import { AuthService } from '../../src/services/auth.service';

const SA_ID = 'sss-school-a', SB_ID = 'sss-school-b';
const MA = 'sss-main-a', MB = 'sss-main-b';
const OWNER = 'sss-owner', SUPER = 'sss-super', OUTSIDER = 'sss-outsider';

const decode = (t: string) => jwt.verify(t, config.jwtSecret) as any;

async function cleanup() {
  for (const sid of [SA_ID, SB_ID]) {
    await (prisma as any).schoolMembership.deleteMany({ where: { school_id: sid } }).catch(() => {});
    await prisma.user.deleteMany({ where: { school_id: sid } }).catch(() => {});
    await prisma.branch.deleteMany({ where: { school_id: sid } }).catch(() => {});
    await prisma.school.delete({ where: { id: sid } }).catch(() => {});
  }
  await prisma.user.deleteMany({ where: { id: { in: [OWNER, SUPER, OUTSIDER] } } }).catch(() => {});
}

describe('School switch scoping', () => {
  beforeAll(async () => {
    await cleanup();
    await prisma.school.create({ data: { id: SA_ID, name: 'A', code: 'SSSA', slug: SA_ID, plan_type: 'enterprise', subscription_status: 'active' } });
    await prisma.school.create({ data: { id: SB_ID, name: 'B', code: 'SSSB', slug: SB_ID, plan_type: 'enterprise', subscription_status: 'active' } });
    await prisma.branch.create({ data: { id: MA, school_id: SA_ID, name: 'Main A', code: 'MAIN', is_main: true } });
    await prisma.branch.create({ data: { id: MB, school_id: SB_ID, name: 'Main B', code: 'MAIN', is_main: true } });

    // Owner belongs to BOTH schools (member of A and B).
    await prisma.user.create({ data: { id: OWNER, email: 'sss-owner@x.com', password_hash: 'x', full_name: 'Owner', role: 'ADMIN' as any, school_id: SA_ID, branch_id: MA } });
    await (prisma as any).schoolMembership.create({ data: { school_id: SA_ID, user_id: OWNER, base_role: 'ADMIN', branch_id: MA, is_active: true } });
    await (prisma as any).schoolMembership.create({ data: { school_id: SB_ID, user_id: OWNER, base_role: 'ADMIN', branch_id: MB, is_active: true } });

    // Super admin (platform operator) — member of A only.
    await prisma.user.create({ data: { id: SUPER, email: 'sss-super@x.com', password_hash: 'x', full_name: 'Super', role: 'SUPER_ADMIN' as any, school_id: SA_ID, branch_id: MA } });

    // Outsider — member of A only, NOT a super admin.
    await prisma.user.create({ data: { id: OUTSIDER, email: 'sss-out@x.com', password_hash: 'x', full_name: 'Outsider', role: 'ADMIN' as any, school_id: SA_ID, branch_id: MA } });
    await (prisma as any).schoolMembership.create({ data: { school_id: SA_ID, user_id: OUTSIDER, base_role: 'ADMIN', branch_id: MA, is_active: true } });
  }, 120000);

  afterAll(cleanup, 120000);

  it('THE BUG: switching schools re-scopes school AND realigns branch to the new school', async () => {
    const { token } = await AuthService.switchSchool(OWNER, SB_ID);
    const claims = decode(token);
    expect(claims.school_id).toBe(SB_ID);
    // branch_id must point at School B's branch, NOT School A's (the stale value).
    expect(claims.branch_id).toBe(MB);
    expect(claims.branch_id).not.toBe(MA);
    // The user row itself is re-scoped too.
    const u = await prisma.user.findUnique({ where: { id: OWNER } });
    expect(u!.school_id).toBe(SB_ID);
    expect(u!.branch_id).toBe(MB);
  });

  it('a SUPER_ADMIN can switch into any school (platform operator)', async () => {
    const { token } = await AuthService.switchSchool(SUPER, SB_ID);
    const claims = decode(token);
    expect(claims.school_id).toBe(SB_ID);
    expect(claims.branch_id).toBe(MB); // realigned to B's main branch
  });

  it('a non-member, non-super-admin is REJECTED (isolation preserved)', async () => {
    await expect(AuthService.switchSchool(OUTSIDER, SB_ID)).rejects.toThrow(/not an active member/i);
    // Outsider stays scoped to School A.
    const u = await prisma.user.findUnique({ where: { id: OUTSIDER } });
    expect(u!.school_id).toBe(SA_ID);
  });
});
