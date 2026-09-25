/**
 * Notification preferences must survive a round trip and then actually change
 * delivery.
 *
 * What was broken: the settings screen sent
 *   { digest_time, categories: [{ id, mode, channel }] }
 * and updateSettingsByUserId kept only values where `typeof value === "boolean"`.
 * An array is not a boolean and neither is a time string, so BOTH were dropped
 * and an empty object was written; the read side then returned the inner blob
 * rather than the row, so digest_time and categories were undefined on load.
 * Nothing saved and nothing restored. On top of that, even a correctly stored
 * preference was never consulted — every notification was written in-app and
 * emitted instantly regardless of "Off" or "Digest".
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import prisma from '../../src/config/database';
import { config } from '../../src/config/env';
import { NotificationDeliveryService } from '../../src/services/notificationDelivery.service';
import { sanitisePreferences } from '../../src/services/notificationPreferences';

const S = 'notifpref-school', B = 'notifpref-main';
const ADMIN = 'notifpref-admin', TARGET = 'notifpref-target';
const auth = {
    Authorization: `Bearer ${jwt.sign(
        { id: ADMIN, email: 'notifpref-admin@x.com', role: 'ADMIN', school_id: S, branch_id: B, allowed_branch_ids: [B] },
        config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' })}`,
};

async function cleanup() {
    await prisma.notification.deleteMany({ where: { school_id: S } }).catch(() => {});
    await prisma.notificationSetting.deleteMany({ where: { school_id: S } }).catch(() => {});
    await prisma.user.deleteMany({ where: { school_id: S } }).catch(() => {});
    await prisma.branch.deleteMany({ where: { school_id: S } }).catch(() => {});
    await prisma.school.delete({ where: { id: S } }).catch(() => {});
}

describe('Notification preferences', () => {
    beforeAll(async () => {
        await cleanup();
        await prisma.school.create({ data: { id: S, name: 'NotifPref', code: 'NOTIFP', slug: S } as any });
        await prisma.branch.create({ data: { id: B, school_id: S, name: 'Main', code: 'NPM', is_main: true } });
        await prisma.user.create({ data: { id: ADMIN, email: 'notifpref-admin@x.com', password_hash: 'x', full_name: 'Admin', role: 'ADMIN' as any, school_id: S, branch_id: B } });
        await prisma.user.create({ data: { id: TARGET, email: 'notifpref-target@x.com', password_hash: 'x', full_name: 'Target', role: 'TEACHER' as any, school_id: S, branch_id: B } });
    }, 60000);
    afterAll(async () => { vi.restoreAllMocks(); await cleanup(); }, 60000);

    // ── the round trip that silently lost everything ────────────────────────
    it('saves the full preference set and reads it back', async () => {
        const body = {
            digest_time: '07:30',
            categories: [
                { id: 'homework', mode: 'off', channel: 'inapp' },
                { id: 'fees', mode: 'instant', channel: 'email' },
                { id: 'attendance', mode: 'digest', channel: 'inapp' },
            ],
        };
        const put = await request(app).put('/api/notifications/settings').set(auth).send(body);
        expect(put.status, JSON.stringify(put.body)).toBe(200);
        expect(put.body.digest_time).toBe('07:30');

        const get = await request(app).get('/api/notifications/settings').set(auth);
        expect(get.status).toBe(200);
        expect(get.body.digest_time, 'digest_time was not persisted').toBe('07:30');
        expect(Array.isArray(get.body.categories), 'categories came back as something other than an array').toBe(true);

        const byId = Object.fromEntries(get.body.categories.map((c: any) => [c.id, c]));
        expect(byId.homework.mode).toBe('off');
        expect(byId.fees.channel).toBe('email');
        expect(byId.attendance.mode).toBe('digest');

        // The row itself must hold the array, not an empty object.
        const row = await prisma.notificationSetting.findUnique({ where: { user_id: ADMIN } });
        expect(Array.isArray(row!.categories as any), 'the DB column holds a non-array').toBe(true);
        expect(row!.digest_time).toBe('07:30');
    }, 60000);

    it('reports which channels this deployment can actually deliver on', async () => {
        const get = await request(app).get('/api/notifications/settings').set(auth);
        expect(get.body.channels).toBeTruthy();
        expect(get.body.channels.inapp).toBe(true);
        // No provider exists for these anywhere in the codebase; the UI must not
        // offer them as if they worked.
        expect(get.body.channels.sms).toBe(false);
        expect(get.body.channels.whatsapp).toBe(false);
    }, 60000);

    // ── server-side enforcement ─────────────────────────────────────────────
    it('refuses to let a client silence emergency alerts or inject unknown keys', async () => {
        const put = await request(app).put('/api/notifications/settings').set(auth).send({
            digest_time: '99:99',                                   // invalid
            categories: [
                { id: 'emergency', mode: 'off', channel: 'inapp' },  // not allowed
                { id: 'not_a_category', mode: 'off', channel: 'inapp' },
                { id: 'fees', mode: 'instant', channel: 'carrier-pigeon' },
            ],
            school_id: 'some-other-school',                          // must never be stored
        });
        expect(put.status).toBe(200);
        const byId = Object.fromEntries(put.body.categories.map((c: any) => [c.id, c]));
        expect(byId.emergency.mode, 'emergency alerts were allowed to be turned off').toBe('instant');
        expect(byId.not_a_category).toBeUndefined();
        expect(byId.fees.channel).not.toBe('carrier-pigeon');
        expect(put.body.digest_time).not.toBe('99:99');
        expect(JSON.stringify(put.body)).not.toContain('some-other-school');
    }, 60000);

    // ── the preference must actually change delivery ────────────────────────
    it('"Off" suppresses, "Digest" holds, "Instant" delivers', async () => {
        await prisma.notificationSetting.upsert({
            where: { user_id: TARGET },
            update: { categories: sanitisePreferences({
                categories: [
                    { id: 'homework', mode: 'off', channel: 'inapp' },
                    { id: 'events', mode: 'digest', channel: 'inapp' },
                    { id: 'behavior', mode: 'instant', channel: 'inapp' },
                ],
            }).categories as any, digest_time: '19:00', school_id: S },
            create: { user_id: TARGET, school_id: S, digest_time: '19:00', categories: sanitisePreferences({
                categories: [
                    { id: 'homework', mode: 'off', channel: 'inapp' },
                    { id: 'events', mode: 'digest', channel: 'inapp' },
                    { id: 'behavior', mode: 'instant', channel: 'inapp' },
                ],
            }).categories as any },
        });

        const base = { schoolId: S, branchId: B, userId: TARGET, title: 'T', message: 'M' };

        const off = await NotificationDeliveryService.deliver({ ...base, category: 'homework' });
        expect(off.suppressed, 'a category set to Off still delivered').toBe(true);
        expect(await prisma.notification.count({ where: { user_id: TARGET, category: 'homework' } })).toBe(0);

        const digest = await NotificationDeliveryService.deliver({ ...base, category: 'events' });
        expect(digest.queuedForDigest, 'a category set to Digest delivered instantly').toBe(true);
        expect(await prisma.notification.count({ where: { user_id: TARGET, category: 'digest:events' } })).toBe(1);

        const instant = await NotificationDeliveryService.deliver({ ...base, category: 'behavior' });
        expect(instant.delivered).toContain('inapp');
        expect(await prisma.notification.count({ where: { user_id: TARGET, category: 'behavior' } })).toBe(1);
    }, 60000);

    it('an unavailable channel falls back to in-app instead of vanishing', async () => {
        await prisma.notificationSetting.update({
            where: { user_id: TARGET },
            data: { categories: sanitisePreferences({
                categories: [{ id: 'general', mode: 'instant', channel: 'sms' }],
            }).categories as any },
        });
        const r = await NotificationDeliveryService.deliver({
            schoolId: S, branchId: B, userId: TARGET, category: 'general', title: 'Fallback', message: 'M',
        });
        expect(r.fellBackToInApp, 'an unconfigured channel silently dropped the message').toBe(true);
        expect(r.delivered).toContain('inapp');
        expect(await prisma.notification.count({ where: { user_id: TARGET, category: 'general' } })).toBe(1);
    }, 60000);

    it('the send endpoint honours the recipient\'s preferences, not the sender\'s wishes', async () => {
        await prisma.notification.deleteMany({ where: { user_id: TARGET } });
        await prisma.notificationSetting.update({
            where: { user_id: TARGET },
            data: { categories: sanitisePreferences({
                categories: [{ id: 'homework', mode: 'off', channel: 'inapp' }],
            }).categories as any },
        });
        const res = await request(app).post('/api/notifications').set(auth).send({
            user_id: TARGET, title: 'Should not arrive', message: 'x', category: 'homework',
        });
        expect(res.status).toBe(201);
        expect(res.body.suppressed).toBe(true);
        expect(await prisma.notification.count({ where: { user_id: TARGET } })).toBe(0);
    }, 60000);
});
