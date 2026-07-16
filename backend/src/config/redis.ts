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

redisConnection.on('error', (err) => {
    isReady = false;
    const now = Date.now();
    if (now - lastErrorLogAt < REDIS_LOG_THROTTLE_MS) return;
    lastErrorLogAt = now;
    console.info(`ℹ️  [Redis] Unavailable (${(err as any).code || err.message}) — rate limiting, CSRF replay guard, and cache fall back to in-memory/per-process behaviour.`);
});

redisConnection.on('ready', () => {
    isReady = true;
    console.log('✅ [Redis] Shared connection ready — cache, rate limiting, and CSRF replay guard are Redis-backed.');
});

redisConnection.connect().catch(() => { /* handled by the error listener */ });

/** True once the shared connection has completed its handshake. Callers use
 * this to decide whether to attempt a Redis op or go straight to their
 * in-memory fallback, avoiding a per-call timeout wait while Redis is down. */
export function isRedisReady(): boolean {
    return isReady;
}

export default redisConnection;
