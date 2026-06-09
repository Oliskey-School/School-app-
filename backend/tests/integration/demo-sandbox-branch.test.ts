/**
 * DEMO SANDBOX BRANCH AUTHORISATION.
 *
 * Reproduces the reported bug: in the demo, switching to a sub-branch (e.g. "Lekki")
 * and taking an action snapped the view back to Main, because the demo session only
 * authorised the sandbox ROOT branch — the sub-branches were missing from
 * allowed_branch_ids, so the frontend treated them as unauthorised and reverted.
 * The session must now authorise EVERY branch under its sandbox root.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../../src/config/database';
import { AuthService } from '../../src/services/auth.service';
import { DemoSeederService } from '../../src/services/demoSeeder.service';

const DEMO = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';
let rootId = '';
let subId = '';

describe('Demo sandbox sub-branch authorisation', () => {
  beforeAll(async () => {
    await DemoSeederService.ensureDemoData();
    // First login resolves/creates the sandbox MAIN root branch.
    const first: any = await AuthService.generateDemoToken('admin', '55.55.55.51');
    rootId = first.user.branch_id;
    // Create a sub-branch under that root, shaped "<root>__<rand>" (how the demo names them).
    subId = `${rootId}__isotest`;
    await prisma.branch.upsert({
      where: { id: subId },
      update: {},
      create: { id: subId, school_id: DEMO, name: 'ISO Test Sub', code: 'ISOTEST', is_demo_virtual: true } as any,
    }).catch(() => {});
  }, 120000);

  afterAll(async () => {
    await prisma.branch.delete({ where: { id: subId } }).catch(() => {});
  }, 60000);

  it('demo admin session authorises the sandbox sub-branch (no snap-back to Main)', async () => {
    const res: any = await AuthService.generateDemoToken('admin', '55.55.55.52');
    expect(res?.token).toBeTruthy();
    expect(res.user.branch_id).toBe(rootId);                       // session rooted at Main
    expect(res.user.allowed_branch_ids).toContain(rootId);         // Main authorised
    expect(res.user.allowed_branch_ids).toContain(subId);          // sub-branch authorised too
  }, 60000);

  it('demo teacher session also authorises the sandbox sub-branch', async () => {
    const res: any = await AuthService.generateDemoToken('teacher', '55.55.55.53');
    expect(res.user.allowed_branch_ids).toContain(subId);
  }, 60000);
});
