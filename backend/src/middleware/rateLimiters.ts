import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import jwt from 'jsonwebtoken';
import { redisConnection, isRedisReady, waitForRedisReady } from '../config/redis';
import { config } from '../config/env';

/**
 * Tiered, Redis-backed rate limiting.
 *
 * Every limiter created here shares ONE Redis-backed store keyed by prefix,
 * so counts survive process restarts and are consistent across horizontally
 * scaled instances — the whole point of moving off express-rate-limit's
 * default in-memory store. When Redis is unreachable, `sendCommand` fails
 * fast (no offline-queue wait) and `passOnStoreError: true` makes the
 * limiter fail OPEN (requests pass through) rather than taking the API down
 * with it — availability over strict enforcement during a Redis outage.
 *
 * Every limiter below is constructed at module-load time (app.ts's route
 * imports run synchronously at boot), which fires each store's one-time Lua
 * script preload before the real Redis connection has finished its async
 * handshake — an instant isRedisReady() check there is a guaranteed-false
 * race on every cold start, not a real outage. waitForRedisReady() gives
 * that one-time call a short bounded wait instead of failing (and logging)
 * on a race that resolves itself a moment later; ongoing per-request calls
 * still check isRedisReady() directly so an actual outage fails fast.
 */
function redisStore(prefix: string) {
    return new RedisStore({
        prefix: `rl:${prefix}:`,
        sendCommand: async (...args: string[]) => {
            if (!isRedisReady() && !(await waitForRedisReady())) {
                return Promise.reject(new Error('Redis not ready'));
            }
            const [command, ...rest] = args;
            return redisConnection.call(command, rest) as Promise<any>;
        },
    });
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
    passOnStoreError: true,
    store: redisStore('global'),
    message: { error: 'Too many requests, please try again later.' },
    skip: (req) => {
        if (process.env.NODE_ENV !== 'production') return true;
        if (req.method === 'OPTIONS') return true;
        const path = req.originalUrl || req.path || '';
        if (KEEPALIVE_PATHS.some(p => path === p || path.startsWith(p + '?'))) return true;
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
const authTierLimiter = (opts: { windowMs: number; limit: number; message: string; prefix: string }) =>
    rateLimit({
        windowMs: opts.windowMs,
        limit: opts.limit,
        keyGenerator: (req) => ipKeyGenerator(req.ip as string),
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        passOnStoreError: true,
        store: redisStore(opts.prefix),
        message: { error: opts.message },
        skip: (req) => process.env.NODE_ENV !== 'production' && (req.ip === '::1' || req.ip === '127.0.0.1'),
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
