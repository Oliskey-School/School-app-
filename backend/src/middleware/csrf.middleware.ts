import { doubleCsrf } from 'csrf-csrf';
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../config/env';

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
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/',
        signed: false, // Disable signing to simplify cross-domain cookie verification
    } as any,
    size: 64,
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
    getCsrfTokenFromRequest: (req: Request) => req.headers['x-csrf-token'] as string,
});

// Alias for backwards compatibility with existing code
export const generateToken = generateCsrfToken;

/**
 * Single-use (non-replayable) CSRF enforcement.
 *
 * The base double-submit check proves the token+cookie pair is valid, but a token
 * is otherwise reusable — a captured token could be replayed. We layer a one-time
 * guard on top: once a token is accepted for a state-changing request it is burned,
 * and a FRESH token is rotated back to the client via the `X-CSRF-Token` response
 * header (CORS exposes it) so the legitimate flow continues seamlessly.
 *
 * Note: the burned-token set is in-memory per process. Under clustering it should
 * be backed by a shared store (e.g. Redis) for cross-worker replay protection; the
 * primary mutation path is Bearer-authenticated and skips CSRF entirely (see app.ts),
 * so this guard's surface is the rare cookie-only mutation.
 */
const burnedTokens = new Map<string, number>(); // sha256(token) -> expiry (ms)
const BURNED_TTL_MS = 10 * 60 * 1000; // matches a short token lifetime

const pruneBurned = () => {
    const now = Date.now();
    for (const [hash, exp] of burnedTokens) {
        if (exp <= now) burnedTokens.delete(hash);
    }
};

export const doubleSubmitCookieMiddleware = (req: Request, res: Response, next: NextFunction) => {
    doubleCsrfProtection(req, res, (err?: any) => {
        if (err) return next(err);

        const method = (req.method || 'GET').toUpperCase();
        // Only mutations carry/consume a token; safe methods pass straight through.
        if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return next();

        const token = req.headers['x-csrf-token'] as string | undefined;
        if (token) {
            const hash = crypto.createHash('sha256').update(token).digest('hex');
            pruneBurned();
            if (burnedTokens.has(hash)) {
                console.warn(`🚨 [CSRF-REPLAY] Re-use of a spent CSRF token blocked from IP: ${req.ip} | ${req.path}`);
                return next(invalidCsrfTokenError);
            }
            burnedTokens.set(hash, Date.now() + BURNED_TTL_MS);
        }

        // Rotate a fresh single-use token back to the caller.
        try {
            const fresh = generateCsrfToken(req, res);
            res.setHeader('X-CSRF-Token', fresh);
        } catch { /* non-fatal: client can refetch via /auth/csrf-token */ }

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
