import { redisConnection, isRedisReady } from '../config/redis';

/**
 * Small Redis-backed cache with an in-memory fallback and per-key TTL.
 *
 * Deliberately conservative about what gets cached: only genuinely hot,
 * SAFE-to-cache reads that are either global (not tenant-scoped) or where a
 * short TTL is an acceptable staleness window. Tenant-scoped LIST endpoints
 * (student lists, timetables, etc.) are NOT cached here — a stale list after
 * an edit would look like a data-loss bug to a school admin. Prefer
 * `invalidate()` on write over long TTLs wherever a cached key can go stale
 * from a mutation.
 */

const memCache = new Map<string, { value: any; expiresAt: number }>();

function memGet<T>(key: string): T | undefined {
    const entry = memCache.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
        memCache.delete(key);
        return undefined;
    }
    return entry.value as T;
}

function memSet(key: string, value: any, ttlSeconds: number) {
    memCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export class CacheService {
    /**
     * Returns the cached value for `key`, or computes it via `fn`, caches it
     * for `ttlSeconds`, and returns it. Falls back to the in-memory map
     * (per-process, so not shared across instances) when Redis is down —
     * cache correctness never blocks the request, worst case is a cache
     * miss that hits the database.
     */
    static async getOrSet<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
        if (isRedisReady()) {
            try {
                const cached = await redisConnection.get(`cache:${key}`);
                if (cached !== null) return JSON.parse(cached) as T;
            } catch { /* fall through to compute + best-effort write */ }
        } else {
            const hit = memGet<T>(key);
            if (hit !== undefined) return hit;
        }

        const value = await fn();

        if (isRedisReady()) {
            redisConnection.set(`cache:${key}`, JSON.stringify(value), 'EX', ttlSeconds).catch(() => { /* best-effort */ });
        } else {
            memSet(key, value, ttlSeconds);
        }
        return value;
    }

    /** Invalidates a cached key immediately (call after any write that affects it). */
    static async invalidate(key: string): Promise<void> {
        memCache.delete(key);
        if (isRedisReady()) {
            await redisConnection.del(`cache:${key}`).catch(() => { /* best-effort */ });
        }
    }
}
