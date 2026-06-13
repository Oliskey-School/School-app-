/**
 * EMAIL UNIQUENESS IS PER SCHOOL + BRANCH (real database)
 *
 * The same email is now an INDEPENDENT account row in a different school OR branch
 * ("each school and branch has its own rows"), and is only rejected as a duplicate
 * within the SAME school + branch.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../../src/config/database';
import { ParentService } from '../../src/services/parent.service';

const SA = 'ept-school-a', SB = 'ept-school-b';
const A1 = 'ept-a-main', A2 = 'ept-a-annex', B1 = 'ept-b-main';
const EMAIL = 'shared-parent@example.com';

const mk = (schoolId: string, branchId: string, n: string) =>
  ParentService.createParent(schoolId, branchId, { full_name: n, email: EMAIL });

async function cleanup() {
  for (const sid of [SA, SB]) {
    for (const m of ['parent', 'user', 'branch'] as const) {
      await (prisma as any)[m].deleteMany({ where: { school_id: sid } }).catch(() => {});
    }
    await prisma.school.delete({ where: { id: sid } }).catch(() => {});
  }
}

describe('Email uniqueness per school + branch', () => {
  beforeAll(async () => {
    await cleanup();
    await prisma.school.create({ data: { id: SA, name: 'A', code: 'EPTA', slug: SA, plan_type: 'enterprise', subscription_status: 'active' } });
    await prisma.school.create({ data: { id: SB, name: 'B', code: 'EPTB', slug: SB, plan_type: 'enterprise', subscription_status: 'active' } });
    await prisma.branch.create({ data: { id: A1, school_id: SA, name: 'Main A', code: 'MAIN', is_main: true } });
    await prisma.branch.create({ data: { id: A2, school_id: SA, name: 'Annex A', code: 'ANX', is_main: false } });
    await prisma.branch.create({ data: { id: B1, school_id: SB, name: 'Main B', code: 'MAIN', is_main: true } });
  }, 120000);

  afterAll(cleanup, 120000);

  it('allows the same email as its own row in School A branch 1', async () => {
    const r = await mk(SA, A1, 'Parent A1');
    expect(r).toBeTruthy();
  });

  it('allows the SAME email in a DIFFERENT branch of the same school (its own row)', async () => {
    const r = await mk(SA, A2, 'Parent A2');
    expect(r).toBeTruthy();
  });

  it('allows the SAME email in a DIFFERENT school (its own row)', async () => {
    const r = await mk(SB, B1, 'Parent B1');
    expect(r).toBeTruthy();
  });

  it('REJECTS the same email again within the SAME school + branch', async () => {
    await expect(mk(SA, A1, 'Duplicate')).rejects.toThrow(/already registered/i);
  });

  it('persisted three independent user rows for the same email', async () => {
    const rows = await prisma.user.findMany({ where: { email: EMAIL } });
    expect(rows.length).toBe(3);
    const keys = rows.map((u) => `${u.school_id}|${u.branch_id}`).sort();
    expect(keys).toEqual([`${SA}|${A1}`, `${SA}|${A2}`, `${SB}|${B1}`].sort());
  });
});
