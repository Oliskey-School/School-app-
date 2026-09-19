/**
 * P0 #3 — plaintext passwords are never persisted.
 * The generated first password is returned ONCE in the create response and
 * verifies against the stored bcrypt hash; the database has no column that
 * could hold it, and no API response carries a stored plaintext password.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { app } from '../../src/app';
import prisma, { getRawPrisma } from '../../src/config/database';
import { config } from '../../src/config/env';

const S = '7d5f1c1e-4444-4444-8444-444444444444', B = 'npp-main', ADMIN = 'npp-admin';
const token = jwt.sign({ id: ADMIN, email: 'npp@x.com', role: 'ADMIN', school_id: S, branch_id: B, allowed_branch_ids: [] }, config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });
const auth = { Authorization: `Bearer ${token}` };

async function cleanup() {
    for (const m of ['classTeacher', 'teacher', 'student', 'parent', 'user', 'branch'] as const) {
        await (prisma as any)[m]?.deleteMany?.({ where: { school_id: S } }).catch(() => {});
    }
    await prisma.school.delete({ where: { id: S } }).catch(() => {});
}

describe('No plaintext password persistence', () => {
    beforeAll(async () => {
        await cleanup();
        await prisma.school.create({ data: { id: S, name: 'NPP', code: 'NPP', slug: 'npp-school', plan_type: 'premium', subscription_status: 'active' } as any });
        await prisma.branch.create({ data: { id: B, school_id: S, name: 'Main', code: 'NPPMAIN', is_main: true } as any });
        await prisma.user.create({ data: { id: ADMIN, email: 'npp@x.com', password_hash: 'x', full_name: 'Admin', role: 'ADMIN' as any, school_id: S, branch_id: B } as any });
    }, 60000);
    afterAll(cleanup, 60000);

    it('the database has no column for a plaintext password', async () => {
        const cols: any[] = await prisma.$queryRawUnsafe(`SELECT column_name FROM information_schema.columns WHERE table_name = 'User' AND column_name ILIKE '%password%'`);
        expect(cols.map(c => c.column_name)).toEqual(['password_hash']);
    });

    it('creating a teacher returns the password once, stores only a hash, and never returns it again', async () => {
        const created = await request(app).post('/api/teachers').set(auth).send({ full_name: 'Plain Text', email: 'plain.text@npp.com', phone: '08011111111' });
        expect([200, 201]).toContain(created.status);
        const oneTime = created.body.initial_password;
        expect(typeof oneTime).toBe('string');
        expect(oneTime.length).toBeGreaterThan(5);

        const user = await prisma.user.findFirst({ where: { email: 'plain.text@npp.com', school_id: S } });
        expect(user).toBeTruthy();
        expect((user as any).initial_password).toBeUndefined();
        // The default client scrubs password_hash from every result (by design); read the stored value through the privileged auth client.
        const row: any[] = await getRawPrisma().$queryRawUnsafe(`SELECT password_hash FROM "User" WHERE email = 'plain.text@npp.com'`);
        expect(row[0].password_hash).not.toBe(oneTime);
        expect(await bcrypt.compare(oneTime, row[0].password_hash)).toBe(true);

        // Nothing that lists or shows the teacher carries a password.
        const list = await request(app).get(`/api/teachers?schoolId=${S}`).set(auth);
        expect(JSON.stringify(list.body)).not.toContain(oneTime);
        expect(JSON.stringify(list.body)).not.toMatch(/"initial_password"/);
        const one = await request(app).get(`/api/teachers/${created.body.id}`).set(auth);
        expect(JSON.stringify(one.body)).not.toContain(oneTime);
    });
});
