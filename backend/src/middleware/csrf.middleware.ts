import { doubleCsrf } from 'csrf-csrf';
import { Request, Response, NextFunction } from 'express';
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
        if (process.env.NODE_ENV !== 'production') {
            return 'dev-session'; // Consistent ID in dev to avoid mismatches during role switches
        }
        const token = req.cookies?.['access_token'] || req.signedCookies?.['access_token'];
        return token || 'anonymous-session';
    },
    cookieName: process.env.NODE_ENV === 'production' ? 'psid-csrf' : 'psid-csrf',
    cookieOptions: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax',
        path: '/',
        signed: process.env.NODE_ENV === 'production', // Only sign in production
    } as any,
    size: 64,
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
    getCsrfTokenFromRequest: (req: Request) => req.headers['x-csrf-token'] as string,
});

// Alias for backwards compatibility with existing code
export const generateToken = generateCsrfToken;
export const doubleSubmitCookieMiddleware = doubleCsrfProtection;

/**
 * Custom Error Handler for CSRF Failures
 */
export const csrfErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    if (err === invalidCsrfTokenError) {
        console.warn(`🚨 [CSRF-ATTACK] Blocked unauthorized mutation attempt from IP: ${req.ip}`);
        console.warn(`   Path: ${req.path} | Method: ${req.method}`);
        console.warn(`   Headers: X-CSRF-Token: ${req.headers['x-csrf-token'] ? 'Present' : 'Missing'}`);
        console.warn(`   Cookies: ${Object.keys(req.cookies || {}).join(', ') || 'None'}`);
        console.warn(`   Signed Cookies: ${Object.keys(req.signedCookies || {}).join(', ') || 'None'}`);
        
        return res.status(403).json({
            error: 'SecurityException: Invalid or missing CSRF token.',
        });
    }
    next(err);
};
