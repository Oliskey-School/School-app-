/**
 * Regression tests for the demo/session bugs that made dashboards go blank
 * ("real data disappears after a while / when I act in another tab").
 *
 * Two independent root causes are guarded here:
 *  1. Shared-cookie precedence — the server must trust each tab's own Bearer token
 *     over the browser-shared cookie, otherwise two tabs (e.g. student + teacher)
 *     stomp on each other's identity.
 *  2. Branch shift on refresh — refreshing a token must keep the session's branch
 *     (carried in the signed refresh token), not rebuild it from the persistent
 *     user row, otherwise demo sessions jump branches and lose all their data.
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import { config } from '../../src/config/env';
import { AuthService } from '../../src/services/auth.service';

describe('Auth session resilience', () => {
    it('prefers the per-tab Bearer token over the shared cookie', async () => {
        const student = await AuthService.generateDemoToken('student');
        const teacher = await AuthService.generateDemoToken('teacher');

        // Simulate a student tab whose request still carries the (shared) cookie
        // that the teacher tab last wrote. The Bearer token is the student's.
        const res = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${student.token}`)
            .set('Cookie', `access_token=${teacher.token}`);

        expect(res.status).toBe(200);
        // Identity must come from the Bearer (student), NOT the cookie (teacher).
        expect(String(res.body.role).toUpperCase()).toBe('STUDENT');
        expect(res.body.id).toBe(student.user.id);
    });

    it('keeps the session branch unchanged across a token refresh', async () => {
        const login = await AuthService.generateDemoToken('student');
        const loginClaims: any = jwt.verify(login.token, config.jwtSecret);

        const refreshed = await AuthService.refreshAccessToken(login.refreshToken);
        const refreshedClaims: any = jwt.verify(refreshed.token, config.jwtSecret);

        expect(refreshedClaims.branch_id).toBe(loginClaims.branch_id);

        // And again after a second rotation — it must remain stable.
        const refreshed2 = await AuthService.refreshAccessToken(refreshed.refreshToken);
        const refreshed2Claims: any = jwt.verify(refreshed2.token, config.jwtSecret);
        expect(refreshed2Claims.branch_id).toBe(loginClaims.branch_id);
    });
});

describe('Session revocation', () => {
    it('rejects a refresh token once it has been rotated', async () => {
        const login = await AuthService.generateDemoToken('student');
        await AuthService.refreshAccessToken(login.refreshToken);
        await expect(AuthService.refreshAccessToken(login.refreshToken)).rejects.toThrow();
    });

    it('lets only ONE of two concurrent refreshes with the same token succeed', async () => {
        const login = await AuthService.generateDemoToken('student');
        const results = await Promise.allSettled([
            AuthService.refreshAccessToken(login.refreshToken),
            AuthService.refreshAccessToken(login.refreshToken),
        ]);
        expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    });

    it('logout ends the server session, so the refresh token stops working', async () => {
        const login = await AuthService.generateDemoToken('student');
        const res = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${login.token}`).send({});
        expect(res.status).toBe(200);
        await expect(AuthService.refreshAccessToken(login.refreshToken)).rejects.toThrow();
    });

    it('logout with a forged token revokes nothing and still succeeds', async () => {
        const login = await AuthService.generateDemoToken('student');
        const forged = jwt.sign({ sid: login.refreshToken.split('.')[2] }, 'not-the-secret');
        const res = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${forged}`).send({});
        expect(res.status).toBe(200);
        await expect(AuthService.refreshAccessToken(login.refreshToken)).resolves.toBeTruthy();
    });

    it('password change signs out other sessions but keeps the current one', async () => {
        const current = await AuthService.generateDemoToken('teacher');
        // Same user, same second: each login must still be its own session.
        const other = await AuthService.generateDemoToken('teacher');
        expect(other.refreshToken).not.toBe(current.refreshToken);
        const sid = (jwt.verify(current.token, config.jwtSecret) as any).sid;
        await AuthService.revokeUserSessions(current.user.id, sid);
        await expect(AuthService.refreshAccessToken(other.refreshToken)).rejects.toThrow();
        await expect(AuthService.refreshAccessToken(current.refreshToken)).resolves.toBeTruthy();
    });
});
