import IORedis from 'ioredis';

/**
 * Single shared Redis connection for the whole backend — the job queue, rate
 * limiter, CSRF replay guard, and cache service all reuse this one client
 * instead of opening their own. Every consumer must degrade gracefully (to
 * an in-memory fallback) when Redis is unreachable; this module never throws
 * on connection failure, it only logs (throttled) and keeps retrying.
 */

const REDIS_LOG_THROTTLE_MS = 60_000;
let lastErrorLogAt = 0;

/** When this module was loaded — i.e. process start, for practical purposes. */
const PROCESS_START_AT = Date.now();
/**
 * How long after boot waitForRedisReady() may still block. Past this, a
 * not-yet-ready Redis is treated as a real outage and callers fail fast to
 * their in-memory fallback. Generous enough to cover a slow boot (dev's
 * synchronous tsx transpile can block the event loop for several seconds),
 * short enough that a permanently unreachable Redis cannot keep taxing every
 * request. Override with REDIS_STARTUP_GRACE_MS if a deployment needs longer.
 */
const STARTUP_GRACE_MS = (() => {
    const v = parseInt(process.env.REDIS_STARTUP_GRACE_MS || '', 10);
    return Number.isFinite(v) && v > 0 ? v : 60_000;
})();

export const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy(times) {
        // Conservative backoff: start at 1s, cap at 30s.
        return Math.min(Math.max(times * 1000, 1000), 30000);
    },
});

let isReady = false;
let everBeenReady = false;

redisConnection.on('error', (err) => {
    isReady = false;
    const now = Date.now();
    if (now - lastErrorLogAt < REDIS_LOG_THROTTLE_MS) return;
    lastErrorLogAt = now;
    console.info(`ℹ️  [Redis] Unavailable (${(err as any).code || err.message}) — rate limiting, CSRF replay guard, and cache fall back to in-memory/per-process behaviour.`);
});

redisConnection.on('ready', () => {
    isReady = true;
    everBeenReady = true;
    console.log('✅ [Redis] Shared connection ready — cache, rate limiting, and CSRF replay guard are Redis-backed.');
});

redisConnection.connect().catch(() => { /* handled by the error listener */ });

/** True once the shared connection has completed its handshake. Callers use
 * this to decide whether to attempt a Redis op or go straight to their
 * in-memory fallback, avoiding a per-call timeout wait while Redis is down. */
export function isRedisReady(): boolean {
    return isReady;
}

/**
 * Resolves once the connection is ready, or `false` after `timeoutMs`.
 *
 * Exists ONLY for the one-time startup race: rate limiters (and anything
 * else) built at module-load time fire their first Redis call before the
 * real (async) TCP handshake to even a local Redis has finished — an
 * instant `isRedisReady()` check there is a guaranteed-false race on every
 * cold start, not an actual outage, so it's worth a short bounded wait.
 *
 * The default is deliberately generous (not ~100ms, which is all a real
 * handshake needs): in dev, `tsx` transpiles the whole route tree
 * synchronously on boot, which blocks the event loop for several seconds
 * and delays EVERY pending callback by roughly the same amount — including
 * this timer and Redis's own 'ready' event. A short timeout races those two
 * equally-delayed callbacks against each other and can lose by milliseconds
 * even though Redis was never actually slow. In production (pre-built, no
 * blocking transpile step) this resolves almost immediately regardless.
 *
 * Once the connection has been ready at least once, this returns instantly
 * (`false` if currently down) instead of waiting — a LATER outage must
 * still fail fast per-request, or every request would eat a `timeoutMs`
 * stall for as long as Redis stays down, which is the opposite of the
 * fail-open design this exists to protect.
 */
export function waitForRedisReady(timeoutMs = 10_000): Promise<boolean> {
    if (isReady) return Promise.resolve(true);
    if (everBeenReady) return Promise.resolve(false);
    // The `everBeenReady` guard above only fails fast once Redis has connected
    // at least ONCE. If Redis is never reachable, that guard never arms and
    // every rate-limited request pays the full timeoutMs — forever.
    //
    // Confirmed in production 2026-08-21: /api/auth/csrf-token took 10.6s,
    // 14.6s and 20.2s on three consecutive calls, while /api/health and /live
    // (both in KEEPALIVE_PATHS, so they skip the rate limiter) stayed under
    // 0.9s. The whole app was gated behind this: the demo took ~40s to open.
    //
    // Bound the wait to a real startup window instead. That still covers the
    // race this function exists for — a first Redis call issued before the
    // async handshake completes — while guaranteeing a permanently absent
    // Redis degrades to the in-memory fallback promptly, which is the
    // fail-open behaviour the rest of this module is built around.
    if (Date.now() - PROCESS_START_AT > STARTUP_GRACE_MS) return Promise.resolve(false);
    return new Promise((resolve) => {
        const onReady = () => {
            clearTimeout(timer);
            resolve(true);
        };
        const timer = setTimeout(() => {
            redisConnection.off('ready', onReady);
            resolve(false);
        }, timeoutMs);
        redisConnection.once('ready', onReady);
    });
}

export default redisConnection;
