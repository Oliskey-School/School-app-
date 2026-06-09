/**
 * DEMO LOGIN ("Try Demo" funnel) — real database.
 *
 * Regression for the bug where only the FIRST demo visitor could enter: every
 * visitor's session tried to create a per-IP branch hardcoded to code "MAIN",
 * but (school_id, code) is unique — so the 2nd visitor onward crashed with a 400
 * unique-violation and never reached the demo. The fix converges all sessions on
 * the single shared MAIN branch. This proves several different "visitors" (IPs)
 * and roles can all sign in.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { AuthService } from '../../src/services/auth.service';
import { DemoSeederService } from '../../src/services/demoSeeder.service';

describe('Demo login funnel', () => {
  beforeAll(async () => {
    await DemoSeederService.ensureDemoData();
  }, 120000);

  it('several visitors from DIFFERENT IPs can all enter the demo (no MAIN branch collision)', async () => {
    const ips = ['101.1.1.1', '202.2.2.2', '203.3.3.3'];
    for (const ip of ips) {
      const res: any = await AuthService.generateDemoToken('admin', ip);
      expect(res?.token).toBeTruthy();
      expect(res?.user?.id).toContain('_ADM_'); // readable MAIN-coded id
    }
  }, 120000);

  it('all four demo roles can sign in', async () => {
    for (const role of ['admin', 'teacher', 'student', 'parent']) {
      const res: any = await AuthService.generateDemoToken(role, '204.4.4.4');
      expect(res?.token).toBeTruthy();
    }
  }, 120000);
});
