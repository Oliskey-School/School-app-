import { z } from 'zod';
type AnyZodObject = z.ZodObject<any>;
import { Request, Response, NextFunction } from 'express';

// Rate limiters (loginLimiter, passwordResetLimiter, exportLimiter, etc.) moved
// to middleware/rateLimiters.ts — they are now Redis-backed and tiered rather
// than in-memory. Re-exported here so existing imports keep working.
export { loginLimiter, passwordResetLimiter, exportLimiter, signupLimiter, demoLoginLimiter } from './rateLimiters';

/**
 * INJECTION PROTECTION (Strict Zod Validation)
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
