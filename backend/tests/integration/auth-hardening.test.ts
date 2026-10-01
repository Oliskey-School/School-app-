/**
 * Authentication hardening.
 *
 * Covers the token-level attacks the suite did not exercise: forged and
 * unsigned tokens, expired tokens, a token signed with the wrong secret, a
 * token whose role claim has been escalated, and error responses that must not
 * leak hashes, secrets, connection strings or stack traces.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import prisma from '../../src/config/database';
import { config } from '../../src/config/env';
import { runAsPlatform } from '../../src/lib/tenantContext';

const S = 'ah-school', B = 'ah-branch', STUDENT_U = 'ah-student-u', ADMIN_U = 'ah-admin-u';

async function wipe() {
    await runAsPlatform(async () => {
        for (const m of ['student', 'user', 'branch'] as const) {
            await (prisma as any)[m].deleteMany({ where: { school_id: S } }).catch(() => {});
        }
        await prisma.school.delete({ where: { id: S } }).catch(() => {});
    });
}

describe('Authentication hardening', () => {
    beforeAll(async () => {
        await wipe();
        await runAsPlatform(async () => {
            await prisma.school.create({ data: { id: S, name: 'AH School', code: 'AHS', slug: 'ah-school', plan_type: 'premium', subscription_status: 'active' } as any });
            await prisma.branch.create({ data: { id: B, school_id: S, name: 'Main', code: 'AHM', is_main: true } as any });
            await prisma.user.create({ data: { id: ADMIN_U, email: 'ah-admin@x.com', password_hash: 'not-a-real-hash', full_name: 'Admin', role: 'ADMIN' as any, school_id: S, branch_id: B } as any });
            await prisma.user.create({ data: { id: STUDENT_U, email: 'ah-stu@x.com', password_hash: 'not-a-real-hash', full_name: 'Student', role: 'STUDENT' as any, school_id: S, branch_id: B } as any });
            await prisma.student.create({ data: { user_id: STUDENT_U, school_id: S, branch_id: B, full_name: 'Student', grade: 7, section: 'A', school_generated_id: 'AHS_AHM_STU_0001' } as any });
        });
    }, 120000);
    afterAll(wipe, 120000);

    const PROTECTED = '/api/teachers';

    it('rejects unsigned, wrongly-signed, malformed and expired tokens', async () => {
        const claims = { id: ADMIN_U, email: 'ah-admin@x.com', role: 'ADMIN', school_id: S, branch_id: B, allowed_branch_ids: [B] };
        const noneToken = [
            Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url'),
            Buffer.from(JSON.stringify(claims)).toString('base64url'),
            '',
        ].join('.');

        const cases: [string, string][] = [
            ['alg=none', noneToken],
            ['wrong secret', jwt.sign(claims, 'an-attacker-chosen-secret-that-is-long-enough', { algorithm: 'HS256' })],
            ['expired', jwt.sign(claims, config.jwtSecret, { algorithm: 'HS256', expiresIn: '-1h' })],
            ['garbage', 'not.a.jwt'],
            ['empty', ''],
            ['tampered payload', (() => {
                const good = jwt.sign(claims, config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });
                const [h, , sig] = good.split('.');
                return [h, Buffer.from(JSON.stringify({ ...claims, role: 'SUPER_ADMIN' })).toString('base64url'), sig].join('.');
            })()],
        ];

        const accepted: string[] = [];
        for (const [label, token] of cases) {
            const res = await request(app).get(PROTECTED).set('Authorization', `Bearer ${token}`);
            if (res.status !== 401) accepted.push(`${label} → ${res.status}`);
        }
        expect(accepted, `tokens that were not rejected with 401:\n${accepted.join('\n')}`).toEqual([]);
    }, 120000);

    it('a request with no Authorization header is rejected', async () => {
        expect((await request(app).get(PROTECTED)).status).toBe(401);
    }, 60000);

    it('every jwt.verify in the codebase pins its algorithm', async () => {
        const { readFileSync, readdirSync, statSync } = await import('fs');
        const { join } = await import('path');
        const walk = (dir: string): string[] => readdirSync(dir).flatMap(f => {
            const p = join(dir, f);
            return statSync(p).isDirectory() ? walk(p) : (p.endsWith('.ts') ? [p] : []);
        });
        const unpinned: string[] = [];
        for (const file of walk(join(__dirname, '..', '..', 'src'))) {
            readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
                if (line.includes('jwt.verify(') && !line.includes('algorithms')) unpinned.push(`${file.split('src')[1]}:${i + 1}`);
            });
        }
        expect(unpinned, `jwt.verify without an algorithm allowlist:\n${unpinned.join('\n')}`).toEqual([]);
    }, 60000);

    it('a token whose role claim was escalated cannot use admin endpoints', async () => {
        // Correctly signed, but the STUDENT's user id carries an ADMIN role claim.
        // Authorisation must follow the database record, not the token.
        const escalated = jwt.sign(
            { id: STUDENT_U, email: 'ah-stu@x.com', role: 'ADMIN', school_id: S, branch_id: B, allowed_branch_ids: [B] },
            config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });
        const res = await request(app).get('/api/users').set('Authorization', `Bearer ${escalated}`);
        expect([401, 403], `a student with an ADMIN role claim reached /api/users (${res.status})`).toContain(res.status);
    }, 120000);

    it('failed sign-in does not leak hashes, secrets, connection strings or stack traces', async () => {
        const responses = await Promise.all([
            request(app).post('/api/auth/login').send({ email: 'ah-admin@x.com', password: 'wrong-password' }),
            request(app).post('/api/auth/login').send({ email: 'nobody@nowhere.test', password: 'wrong-password' }),
            request(app).post('/api/auth/login').send({}),
            request(app).get('/api/students/../../etc/passwd'),
        ]);
        const forbidden = [/\$2[aby]\$/, /postgres(ql)?:\/\//, /password_hash/i, /at [A-Za-z]+ \(.*\.ts:\d+/, /JWT_SECRET/i, /node_modules/];
        const leaks: string[] = [];
        for (const res of responses) {
            const body = JSON.stringify(res.body ?? '') + String(res.text ?? '');
            for (const rx of forbidden) {
                if (rx.test(body)) leaks.push(`${rx} in ${body.slice(0, 160)}`);
            }
        }
        expect(leaks, `sensitive material in an error response:\n${leaks.join('\n')}`).toEqual([]);
    }, 120000);

    it('the two wrong-password responses are indistinguishable (no user enumeration)', async () => {
        const known = await request(app).post('/api/auth/login').send({ email: 'ah-admin@x.com', password: 'wrong-password' });
        const unknown = await request(app).post('/api/auth/login').send({ email: 'nobody@nowhere.test', password: 'wrong-password' });
        expect(known.status, 'existing vs unknown account gave different statuses').toBe(unknown.status);
        expect(JSON.stringify(known.body), 'existing vs unknown account gave different messages').toBe(JSON.stringify(unknown.body));
    }, 120000);
});
