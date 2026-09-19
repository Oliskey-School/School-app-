import rateLimit, { ipKeyGenerator, MemoryStore } from 'express-rate-limit';
import type { Store, Options, IncrementResponse, ClientRateLimitInfo } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import jwt from 'jsonwebtoken';
import { redisConnection, redisConfigured, isRedisReady, waitForRedisReady } from '../config/redis';
import { config } from '../config/env';

/**
 * Tiered rate limiting with a store that ALWAYS enforces.
 *
 * When REDIS_URL is set, every limiter shares one Redis-backed store keyed by
 * prefix, so counts survive process restarts and are consistent across
 * horizontally scaled instances. When Redis is not configured, or is
 * configured but unreachable, the store falls back to express-rate-limit's
 * in-process MemoryStore for that call — limits are still enforced, just per
 * process/instance.
 *
 * ROOT CAUSE this replaces: the limiters used a bare RedisStore with
 * `passOnStoreError: true`. With no Redis (production on Vercel has none) the
 * store rejected "Redis not ready" on every call, and passOnStoreError turned
 * EVERY limiter into a no-op — unlimited login, OTP, password-reset and
 * signup attempts — while logging an error storm at each cold start.
 * Regression test: tests/integration/rate-limit-without-redis.test.ts.
 */
const REDIS_STORE_LOG_THROTTLE_MS = 60_000;
let lastStoreErrorLogAt = 0;
function logStoreErrorThrottled(prefix: string, err: unknown) {
    const now = Date.now();
    if (now - lastStoreErrorLogAt < REDIS_STORE_LOG_THROTTLE_MS) return;
    lastStoreErrorLogAt = now;
    console.warn(`⚠️  [RateLimit] Redis store "${prefix}" unavailable (${(err as Error)?.message || err}); enforcing in memory until Redis is back.`);
}

class ResilientStore implements Store {
    readonly localKeys = false;
    private readonly memory = new MemoryStore();
    private readonly redis: RedisStore | null;
    private redisInitialised = false;

    constructor(readonly prefix: string) {
        this.redis = redisConfigured
            ? new RedisStore({
                prefix: `rl:${prefix}:`,
                sendCommand: async (...args: string[]) => {
                    // Limiters are built at module load, before the async Redis
                    // handshake completes — waitForRedisReady() bounds that
                    // one-time race; a real outage fails fast (see config/redis.ts).
                    if (!isRedisReady() && !(await waitForRedisReady())) {
                        throw new Error('Redis not ready');
                    }
                    const [command, ...rest] = args;
                    return redisConnection.call(command, rest) as Promise<any>;
                },
            })
            : null;
    }

    init(options: Options) {
        this.memory.init(options);
        if (!this.redis) return;
        // Preload the Lua scripts, but never let a missing Redis fail the
        // limiter: the first successful increment loads them on demand.
        this.redis.init(options).then(() => { this.redisInitialised = true; }).catch((err) => logStoreErrorThrottled(this.prefix, err));
    }

    private redisUsable(): boolean {
        return !!this.redis && isRedisReady();
    }

    async increment(key: string): Promise<IncrementResponse> {
        if (this.redisUsable()) {
            try { return await this.redis!.increment(key); }
            catch (err) { logStoreErrorThrottled(this.prefix, err); }
        }
        return this.memory.increment(key);
    }

    async get(key: string): Promise<ClientRateLimitInfo | undefined> {
        if (this.redisUsable() && this.redisInitialised) {
            try { return await this.redis!.get(key); }
            catch (err) { logStoreErrorThrottled(this.prefix, err); }
        }
        return this.memory.get(key);
    }

    async decrement(key: string): Promise<void> {
        if (this.redisUsable()) {
            try { await this.redis!.decrement(key); return; }
            catch (err) { logStoreErrorThrottled(this.prefix, err); }
        }
        this.memory.decrement(key);
    }

    async resetKey(key: string): Promise<void> {
        if (this.redisUsable()) {
            try { await this.redis!.resetKey(key); }
            catch (err) { logStoreErrorThrottled(this.prefix, err); }
        }
        this.memory.resetKey(key);
    }

    resetAll(): void {
        this.memory.resetAll();
    }

    shutdown(): void {
        this.memory.shutdown();
    }
}

function redisStore(prefix: string): Store {
    return new ResilientStore(prefix);
}

/**
 * Authenticated requests are keyed by user ID (from the Bearer JWT) so a
 * whole school sharing one NAT IP doesn't share one budget. Unauthenticated
 * requests fall back to the IPv6-safe IP key. Verifying the JWT here is
 * cheap (sync HMAC) and side-effect-free — a bad/expired token just falls
 * back to IP keying; the real auth check still happens in auth.middleware.
 */
function userOrIpKeyGenerator(req: any, res: any): string {
    const authHeader = req.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        try {
            const decoded: any = jwt.verify(authHeader.slice(7), config.jwtSecret);
            if (decoded?.id) return `user:${decoded.id}`;
        } catch { /* fall through to IP keying */ }
    }
    return `ip:${ipKeyGenerator(req.ip)}`;
}

function envInt(name: string, fallback: number): number {
    const v = parseInt(process.env[name] || '', 10);
    return Number.isFinite(v) && v > 0 ? v : fallback;
}

// ---------------------------------------------------------------------------
// Global API tier — the default budget for any request that doesn't match a
// stricter tier below. Authenticated callers get a higher per-user budget
// than the shared-IP default, since a school's whole staff room/lab can sit
// behind one NAT IP.
// ---------------------------------------------------------------------------
const GLOBAL_WINDOW_MS = envInt('RATE_LIMIT_WINDOW_MS', 60_000);
const GLOBAL_IP_LIMIT = envInt('RATE_LIMIT_MAX', 1800);          // ~30 r/s per shared IP
const GLOBAL_USER_LIMIT = envInt('RATE_LIMIT_USER_MAX', 3600);   // ~60 r/s per authenticated user

const KEEPALIVE_PATHS = ['/api/health', '/live', '/ready'];

export const globalApiLimiter = rateLimit({
    windowMs: GLOBAL_WINDOW_MS,
    limit: (req: any) => (userOrIpKeyGenerator(req, null).startsWith('user:') ? GLOBAL_USER_LIMIT : GLOBAL_IP_LIMIT),
    keyGenerator: userOrIpKeyGenerator,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    store: redisStore('global'),
    message: { error: 'Too many requests, please try again later.' },
    skip: (req) => {
        if (process.env.NODE_ENV !== 'production') return true;
        if (req.method === 'OPTIONS') return true;
        const path = req.originalUrl || req.path || '';
        if (KEEPALIVE_PATHS.some(p => path === p || path.startsWith(p + '?'))) return true;
        // Demo auth endpoints already have their own dedicated limiter
        // (demoLoginLimiter, mounted in auth.routes). Running BOTH here would mean
        // every "Try Demo" click pays two Redis round trips for the same decision —
        // keep the single, purpose-built limiter for this path.
        if (path.startsWith('/api/auth/demo/')) return true;
        const ip = req.ip || req.connection?.remoteAddress;
        if (ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1') return true;
        return false;
    },
});

// ---------------------------------------------------------------------------
// Auth tier — brute-force / credential-stuffing protection on the endpoints
// that matter most. Always IP-keyed: at login/signup time there is no user
// identity yet, so this is the ONLY signal available and must not be
// bypassable by presenting an arbitrary (even garbage) bearer token.
// ---------------------------------------------------------------------------
const isLoopback = (ip: string | undefined) =>
    ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1';

const authTierLimiter = (opts: { windowMs: number; limit: number; message: string; prefix: string }) =>
    rateLimit({
        windowMs: opts.windowMs,
        limit: opts.limit,
        keyGenerator: (req) => ipKeyGenerator(req.ip as string),
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        store: redisStore(opts.prefix),
        message: { error: opts.message },
        // Loopback is exempt outside production so local tooling and the E2E
        // suites can log in repeatedly. On a dual-stack listener an IPv4 loopback
        // connection is reported as the IPv4-mapped form, so that spelling has to
        // be accepted too or the exemption silently never applies.
        skip: (req) => process.env.NODE_ENV !== 'production' && isLoopback(req.ip),
    });

export const loginLimiter = authTierLimiter({
    windowMs: 15 * 60 * 1000,
    limit: envInt('RATE_LIMIT_LOGIN_MAX', 5),
    message: 'Too many login attempts. Please try again after 15 minutes.',
    prefix: 'login',
});

export const signupLimiter = authTierLimiter({
    windowMs: 60 * 60 * 1000,
    limit: envInt('RATE_LIMIT_SIGNUP_MAX', 10),
    message: 'Too many signup attempts. Please try again later.',
    prefix: 'signup',
});

export const passwordResetLimiter = authTierLimiter({
    windowMs: 60 * 60 * 1000,
    limit: envInt('RATE_LIMIT_PASSWORD_RESET_MAX', 5),
    message: 'Password reset limit reached. Please try again later.',
    prefix: 'pwreset',
});

export const demoLoginLimiter = authTierLimiter({
    windowMs: 15 * 60 * 1000,
    limit: envInt('RATE_LIMIT_DEMO_MAX', 1000),
    message: 'Too many demo login attempts, please try again later.',
    prefix: 'demo',
});

// Email/OTP verification endpoints are unauthenticated and trigger a real
// email send per request — without this, they're a free email-bombing and
// OTP brute-force vector (parentAuth.routes.ts).
export const otpLimiter = authTierLimiter({
    windowMs: 15 * 60 * 1000,
    limit: envInt('RATE_LIMIT_OTP_MAX', 8),
    message: 'Too many verification attempts. Please try again later.',
    prefix: 'otp',
});

// ---------------------------------------------------------------------------
// Heavy-operation tier — expensive/synchronous endpoints (exports, bulk
// reports) get their own tight budget independent of general API traffic.
// ---------------------------------------------------------------------------
export const exportLimiter = authTierLimiter({
    windowMs: 60 * 60 * 1000,
    limit: envInt('RATE_LIMIT_EXPORT_MAX', 10),
    message: 'Export limit reached. Heavy data operations are restricted.',
    prefix: 'export',
});
