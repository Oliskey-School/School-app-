/**
 * ONBOARDING — ROW CREATION + CROSS-SCHOOL ISOLATION (real database)
 *
 * Verifies that creating a school provisions EVERY required row atomically:
 *   - the school row (with its typed code, slug, plan, trial)
 *   - the Main Branch row (is_main = true) AND every additional branch row
 *   - the owner admin user (role ADMIN, scoped to school + main branch, with a
 *     Global ID in SCHOOL_BRANCH_ROLE_NUMBER format)
 *   - the school membership row
 * and that two independently-created schools are fully isolated (no row of one
 * is ever visible under the other's school_id; codes don't collide).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../../src/config/database';
import { OnboardingService, OnboardingData } from '../../src/services/onboarding.service';

const RND = Math.random().toString(36).slice(2, 5).toUpperCase();
const A_CODE = `TA${RND}`;        // school A code
const B_CODE = `TB${RND}`;        // school B code

function payload(schoolCode: string, email: string): OnboardingData {
  return {
    schoolName: `Test School ${schoolCode}`,
    schoolCode,
    schoolEmail: `info-${schoolCode}@test.com`,
    phone: '08000000000',
    address: '1 Test Road',
    state: 'Lagos',
    mainBranchName: 'Main Campus',
    mainBranchCode: 'MAIN',
    additionalBranches: [{ name: 'Annex Campus', code: 'BRN2' }],
    adminName: `Owner ${schoolCode}`,
    adminEmail: email,
    adminPassword: 'StrongPass123!',
    planType: 'enterprise',
  };
}

async function cleanup() {
  for (const code of [A_CODE, B_CODE]) {
    const school = await prisma.school.findUnique({ where: { code } }).catch(() => null);
    if (!school) continue;
    const sid = school.id;
    for (const m of ['schoolMembership', 'user', 'branch'] as const) {
      await (prisma as any)[m].deleteMany({ where: { school_id: sid } }).catch(() => {});
    }
    await prisma.school.delete({ where: { id: sid } }).catch(() => {});
  }
}

let A: any, B: any;

describe('Onboarding row creation + isolation', () => {
  beforeAll(async () => {
    await cleanup();
    A = (await OnboardingService.createSchoolWithSetup(payload(A_CODE, `owner-${A_CODE}@test.com`))).data;
    B = (await OnboardingService.createSchoolWithSetup(payload(B_CODE, `owner-${B_CODE}@test.com`))).data;
  }, 120000);

  afterAll(cleanup, 120000);

  it('creates the school row with its typed code, slug, plan and trial', async () => {
    const school = await prisma.school.findUnique({ where: { id: A.schoolId } });
    expect(school).toBeTruthy();
    expect(school!.code).toBe(A_CODE);
    expect(school!.plan_type).toBe('enterprise');
    expect(school!.slug).toBeTruthy();
    expect(school!.trial_ends_at).toBeTruthy();
  });

  it('creates the Main Branch row (is_main = true) scoped to the school', async () => {
    const main = await prisma.branch.findUnique({ where: { id: A.mainBranchId } });
    expect(main).toBeTruthy();
    expect(main!.is_main).toBe(true);
    expect(main!.code).toBe('MAIN');
    expect(main!.school_id).toBe(A.schoolId);
  });

  it('creates every additional branch row scoped to the school', async () => {
    const branches = await prisma.branch.findMany({ where: { school_id: A.schoolId } });
    expect(branches.length).toBe(2); // Main + Annex
    const annex = branches.find((b) => b.code === 'BRN2');
    expect(annex).toBeTruthy();
    expect(annex!.is_main).toBe(false);
    expect(annex!.school_id).toBe(A.schoolId);
  });

  it('creates the owner admin user with a SCHOOL_BRANCH_ROLE_NUMBER Global ID', async () => {
    const admin = await prisma.user.findUnique({ where: { id: A.adminUserId } });
    expect(admin).toBeTruthy();
    expect(admin!.role).toBe('ADMIN');
    expect(admin!.school_id).toBe(A.schoolId);
    expect(admin!.branch_id).toBe(A.mainBranchId);
    expect(admin!.school_generated_id).toBeTruthy();
    // Format: {SCHOOL}_{BRANCH}_{ADM}_... — contains the typed codes + role code.
    expect(admin!.school_generated_id).toContain(A_CODE);
    expect(admin!.school_generated_id).toContain('MAIN');
    expect(admin!.school_generated_id).toContain('ADM');
  });

  it('creates the school membership row for the owner', async () => {
    const mem = await (prisma as any).schoolMembership.findMany({ where: { school_id: A.schoolId, user_id: A.adminUserId } });
    expect(mem.length).toBe(1);
    expect(mem[0].base_role).toBe('ADMIN');
  });

  it('isolates the two schools — no row of School A appears under School B', async () => {
    const bBranches = await prisma.branch.findMany({ where: { school_id: B.schoolId } });
    const bUsers = await prisma.user.findMany({ where: { school_id: B.schoolId } });
    // None of B's rows belong to A.
    expect(bBranches.every((b) => b.school_id === B.schoolId)).toBe(true);
    expect(bBranches.some((b) => b.id === A.mainBranchId)).toBe(false);
    expect(bUsers.some((u) => u.id === A.adminUserId)).toBe(false);
    // A's admin is not visible when scoped to B.
    const leaked = await prisma.user.findFirst({ where: { id: A.adminUserId, school_id: B.schoolId } });
    expect(leaked).toBeNull();
  });

  it('lets two schools reuse the same branch code without collision', async () => {
    // Both A and B have a branch coded MAIN — that is fine, they are different schools.
    const aMain = await prisma.branch.findFirst({ where: { school_id: A.schoolId, code: 'MAIN' } });
    const bMain = await prisma.branch.findFirst({ where: { school_id: B.schoolId, code: 'MAIN' } });
    expect(aMain).toBeTruthy();
    expect(bMain).toBeTruthy();
    expect(aMain!.id).not.toBe(bMain!.id);
  });
});
