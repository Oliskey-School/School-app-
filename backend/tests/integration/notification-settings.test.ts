/**
 * Regression: "Failed to save preferences" 500 on the Notification Digest screen.
 * NotificationSetting requires school_id (the upsert omitted it) and the FK to
 * User breaks for demo/virtual users.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../../src/config/database';
import { NotificationService } from '../../src/services/notification.service';

const S = 'nset-school', B = 'nset-main', U = 'nset-user';

async function cleanup() {
  await (prisma as any).notificationSetting.deleteMany({ where: { school_id: S } }).catch(() => {});
  await prisma.user.deleteMany({ where: { school_id: S } }).catch(() => {});
  await prisma.branch.deleteMany({ where: { school_id: S } }).catch(() => {});
  await prisma.school.delete({ where: { id: S } }).catch(() => {});
}

describe('Notification settings save', () => {
  beforeAll(async () => {
    await cleanup();
    await prisma.school.create({ data: { id: S, name: 'NSET', code: 'NSET', slug: S, plan_type: 'enterprise', subscription_status: 'active' } });
    await prisma.branch.create({ data: { id: B, school_id: S, name: 'Main', code: 'MAIN', is_main: true } });
    await prisma.user.create({ data: { id: U, email: 'nset@x.com', password_hash: 'x', full_name: 'NSET Admin', role: 'ADMIN' as any, school_id: S, branch_id: B } });
  }, 120000);

  afterAll(cleanup, 120000);

  it('saves preferences for a real user (stamps school_id)', async () => {
    const data = { digest_time: '20:00', categories: [{ id: 'general', mode: 'digest', channel: 'sms' }] };
    await NotificationService.updateSettingsByUserId(U, data, S, B);
    const row = await (prisma as any).notificationSetting.findUnique({ where: { user_id: U } });
    expect(row).toBeTruthy();
    expect(row.school_id).toBe(S);
  });

  it('updating again does not error (upsert update path)', async () => {
    const data = { digest_time: '07:00', categories: [{ id: 'general', mode: 'off', channel: 'email' }] };
    await expect(NotificationService.updateSettingsByUserId(U, data, S, B)).resolves.toBeTruthy();
  });

  it('does NOT 500 for a demo/virtual user (no DB row) — returns the prefs', async () => {
    const data = { digest_time: '19:00', categories: [{ id: 'x', mode: 'instant', channel: 'push' }] };
    const res: any = await NotificationService.updateSettingsByUserId('demo-virtual-id-xyz', data, S, B);
    expect(res).toBeTruthy();
    expect(res.categories).toEqual(data);
  });
});
