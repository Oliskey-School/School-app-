import rateLimit from 'express-rate-limit';
import { z, AnyZodObject } from 'zod';
import { Request, Response, NextFunction } from 'express';

/**
 * 1. BRUTE-FORCE PROTECTION (Rate Limiting)
 */

// Strict limiter for Login: 5 attempts per 15 minutes
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many login attempts. Please try again after 15 minutes.' },
    skip: (req) => process.env.NODE_ENV !== 'production' && req.ip === '::1',
});

// Stricter limiter for Password Reset: 3 attempts per hour
export const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 3,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Password reset limit reached. Please try again later.' },
});

// Limiter for Data Export: 10 per hour
export const exportLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Export limit reached. Heavy data operations are restricted.' },
});

/**
 * 2. INJECTION PROTECTION (Strict Zod Validation)
 */

export const validateRequest = (schema: AnyZodObject) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Lead DevSecOps: Parse and sanitize the body against the schema.
            // This strips any unknown or malicious keys (Mass Assignment Protection)
            // and ensures types are correct before hitting the database (SQLi Protection).
            const validatedData = await schema.parseAsync(req.body);
            
            // Override req.body with the sanitized/validated data
            req.body = validatedData;
            
            next();
        } catch (error: any) {
            console.warn(`🚨 [Security] Validation failed for ${req.path}:`, error.errors);
            return res.status(400).json({
                error: 'Validation Error',
                details: error.errors?.map((e: any) => ({
                    path: e.path.join('.'),
                    message: e.message
                }))
            });
        }
    };
};
