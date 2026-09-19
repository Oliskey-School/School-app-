/**
 * P0 #6 — rate limiting must still enforce limits when Redis is absent.
 * Production (Vercel) has no REDIS_URL. Previously every limiter was built
 * on a RedisStore whose sendCommand rejected "Redis not ready", and
 * `passOnStoreError: true` turned every limiter into a no-op: unlimited
 * login / OTP / password-reset attempts, plus a boot-time error storm.
 */
import { describe, it, expect, beforeAll } from 'vitest';

// Production on Vercel: no REDIS_URL at all. (A local Redis may be running on
// the developer machine and backend/.env may name it — the point is that the
// app must not assume one.) Load the env module FIRST so dotenv cannot put
// REDIS_URL back after we remove it.
import '../../src/config/env';
delete process.env.REDIS_URL;
process.env.RATE_LIMIT_LOGIN_MAX = '3';
process.env.RATE_LIMIT_OTP_MAX = '2';

function fakeReq(ip: string) {
    return { ip, method: 'POST', originalUrl: '/api/auth/login', path: '/api/auth/login', headers: {}, app: { get: () => false } } as any;
}
function fakeRes() {
    const res: any = { statusCode: 200, headers: {} as Record<string, any> };
    res.setHeader = (k: string, v: any) => { res.headers[k] = v; };
    res.getHeader = (k: string) => res.headers[k];
    res.status = (c: number) => { res.statusCode = c; return res; };
    res.send = (b: any) => { res.body = b; return res; };
    res.json = res.send;
    return res;
}
async function hit(limiter: any, ip: string) {
    const res = fakeRes();
    let passed = false;
    await new Promise<void>((resolve) => { const r = limiter(fakeReq(ip), res, () => { passed = true; resolve(); }); Promise.resolve(r).then(() => setTimeout(resolve, 20)); });
    return { passed, status: res.statusCode };
}

describe('rate limiting without Redis', () => {
    let loginLimiter: any, otpLimiter: any, redis: any;
    beforeAll(async () => {
        ({ loginLimiter, otpLimiter } = await import('../../src/middleware/rateLimiters'));
        redis = await import('../../src/config/redis');
    });

    it('does not open a Redis connection when REDIS_URL is unset', () => {
        expect(redis.redisConfigured).toBe(false);
        expect(redis.isRedisReady()).toBe(false);
        expect(redis.redisConnection.status).toBe('wait'); // lazyConnect, never connected
    });

    it('login attempts beyond the limit are rejected with 429 even though no Redis is configured', async () => {
        const ip = '203.0.113.7';
        const results = [];
        for (let i = 0; i < 4; i++) results.push(await hit(loginLimiter, ip));
        expect(results.slice(0, 3).every(r => r.passed)).toBe(true);
        expect(results[3].passed).toBe(false);
        expect(results[3].status).toBe(429);
    });

    it('a different client keeps its own budget', async () => {
        expect((await hit(loginLimiter, '203.0.113.8')).passed).toBe(true);
    });

    it('the OTP limiter is enforced independently of the login limiter', async () => {
        const ip = '203.0.113.9';
        expect((await hit(otpLimiter, ip)).passed).toBe(true);
        expect((await hit(otpLimiter, ip)).passed).toBe(true);
        const third = await hit(otpLimiter, ip);
        expect(third.passed).toBe(false);
        expect(third.status).toBe(429);
    });
});
