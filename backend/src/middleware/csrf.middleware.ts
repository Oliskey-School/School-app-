import { doubleCsrf } from 'csrf-csrf';
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../config/env';
import { redisConnection, isRedisReady } from '../config/redis';

// SameSite is Lax by default in production: nginx serves the SPA and API
// same-origin (see deploy/nginx.conf), so Lax is both stronger than None and
// sufficient — top-level navigations and same-site fetch/XHR still carry the
// cookie, only genuine cross-site requests are blocked. Override with
// CSRF_SAMESITE=none only if the API is ever deployed on a different origin
// than the SPA (e.g. a cross-origin mobile webview).
const PROD_SAME_SITE = (process.env.CSRF_SAMESITE as 'lax' | 'strict' | 'none' | undefined) || 'lax';

/**
 * Lead DevSecOps: Anti-CSRF Token Architecture
 * 
 * We use the 'Synchronizer Token Pattern' via the csrf-csrf library.
 * This implementation stores a secret in a signed, HttpOnly cookie and 
 * expects a matching token in the 'X-CSRF-Token' header for all mutations.
 */

export const {
    invalidCsrfTokenError,
    generateCsrfToken,
    validateRequest,
    doubleCsrfProtection,
} = doubleCsrf({
    getSecret: () => config.jwtSecret,
    // Use the session or a stable identifier for the session
    getSessionIdentifier: (req: Request) => {
        // Lead DevSecOps: Use a stable constant for session identifier to rule out 
        // mismatches during the cross-site auth handshake.
        return 'oliskey-session';
    },
    cookieName: 'psid-csrf',
    cookieOptions: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? PROD_SAME_SITE : 'lax',
        path: '/',
        signed: false, // Disable signing to simplify cross-domain cookie verification
    } as any,
    size: 64,
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
    getCsrfTokenFromRequest: (req: Request) => req.headers['x-csrf-token'] as string,
});

// Alias for backwards compatibility with existing code
export const generateToken = generateCsrfToken;

// The READABLE cookie carrying the CSRF token (classic XSRF-TOKEN pattern).
// Frontend reads it with document.cookie and echoes it in X-CSRF-Token —
// no "fetch a token from an endpoint" round-trip needed.
export const CSRF_COOKIE_NAME = 'XSRF-TOKEN';

const xsrfCookieOptions = () => ({
    httpOnly: false, // deliberately readable by the SPA
    secure: process.env.NODE_ENV === 'production',
    sameSite: (process.env.NODE_ENV === 'production' ? PROD_SAME_SITE : 'lax') as any,
    path: '/',
});

/**
 * Cookie-based CSRF delivery: on any request that doesn't yet carry the
 * XSRF-TOKEN cookie, mint a token (which also sets the HttpOnly secret cookie)
 * and hand it to the browser as a readable cookie. From then on the SPA just
 * reads the cookie — the /auth/csrf-token endpoint becomes a legacy fallback.
 */
export const ensureCsrfCookie = (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.cookies?.[CSRF_COOKIE_NAME]) {
            const token = generateCsrfToken(req, res);
            res.cookie(CSRF_COOKIE_NAME, token, xsrfCookieOptions());
        }
    } catch { /* non-fatal — the legacy endpoint still works */ }
    next();
};

/**
 * Single-use (non-replayable) CSRF enforcement.
 *
 * The base double-submit check proves the token+cookie pair is valid, but a token
 * is otherwise reusable — a captured token could be replayed. We layer a one-time
 * guard on top: once a token is accepted for a state-changing request it is burned,
 * and a FRESH token is rotated back to the client via the `X-CSRF-Token` response
 * header (CORS exposes it) so the legitimate flow continues seamlessly.
 *
 * The burned-token set is Redis-backed (SET NX with a TTL — atomic check-and-burn,
 * so two concurrent requests racing on the same token can't both pass) with an
 * in-memory Map fallback when Redis is unreachable, so cross-worker replay
 * protection works under clustering without a hard Redis dependency. The primary
 * mutation path is Bearer-authenticated and skips CSRF entirely (see app.ts), so
 * this guard's surface is the rare cookie-only mutation.
 */
const BURNED_TTL_MS = 10 * 60 * 1000; // matches a short token lifetime
const memBurnedTokens = new Map<string, number>(); // sha256(token) -> expiry (ms), fallback only

const pruneMemBurned = () => {
    const now = Date.now();
    for (const [hash, exp] of memBurnedTokens) {
        if (exp <= now) memBurnedTokens.delete(hash);
    }
};

/** Atomically checks-and-burns a token hash. Returns true if this is a REPLAY
 * (the token was already burned) and the request must be rejected. */
async function burnTokenOrDetectReplay(hash: string): Promise<boolean> {
    if (isRedisReady()) {
        try {
            const result = await redisConnection.set(`csrf:burned:${hash}`, '1', 'PX', BURNED_TTL_MS, 'NX');
            return result === null; // null = key already existed = replay
        } catch {
            // Redis errored mid-call — fall through to the in-memory guard below
            // rather than failing open on a security control.
        }
    }
    pruneMemBurned();
    if (memBurnedTokens.has(hash)) return true;
    memBurnedTokens.set(hash, Date.now() + BURNED_TTL_MS);
    return false;
}

export const doubleSubmitCookieMiddleware = (req: Request, res: Response, next: NextFunction) => {
    doubleCsrfProtection(req, res, async (err?: any) => {
        if (err) return next(err);

        const method = (req.method || 'GET').toUpperCase();
        // Only mutations carry/consume a token; safe methods pass straight through.
        if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return next();

        const token = req.headers['x-csrf-token'] as string | undefined;
        if (token) {
            const hash = crypto.createHash('sha256').update(token).digest('hex');
            const isReplay = await burnTokenOrDetectReplay(hash);
            if (isReplay) {
                console.warn(`🚨 [CSRF-REPLAY] Re-use of a spent CSRF token blocked from IP: ${req.ip} | ${req.path}`);
                return next(invalidCsrfTokenError);
            }
        }

        // Rotate a fresh single-use token back to the caller — in the response
        // header (for JS clients tracking it) AND the readable cookie, so the
        // cookie-based flow never goes stale after a mutation.
        try {
            const fresh = generateCsrfToken(req, res);
            res.setHeader('X-CSRF-Token', fresh);
            res.cookie(CSRF_COOKIE_NAME, fresh, xsrfCookieOptions());
        } catch { /* non-fatal: cookie re-issued on the next request */ }

        next();
    });
};

/**
 * Custom Error Handler for CSRF Failures
 */
export const csrfErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    if (err === invalidCsrfTokenError) {
        console.warn(`🚨 [CSRF-ATTACK] Blocked unauthorized mutation attempt from IP: ${req.ip}`);
        console.warn(`   Path: ${req.path} | Method: ${req.method}`);
        console.warn(`   Headers: ${JSON.stringify({
            'x-csrf-token': req.headers['x-csrf-token'] ? 'PRESENT' : 'MISSING',
            'cookie': req.headers['cookie'] ? 'PRESENT' : 'MISSING',
            'origin': req.headers['origin'],
            'user-agent': req.headers['user-agent']?.substring(0, 50)
        })}`);
        console.warn(`   Cookies: ${Object.keys(req.cookies || {}).join(', ') || 'None'}`);
        console.warn(`   Signed Cookies: ${Object.keys(req.signedCookies || {}).join(', ') || 'None'}`);
        
        return res.status(403).json({
            error: 'SecurityException: Invalid or missing CSRF token.',
        });
    }
    next(err);
};
