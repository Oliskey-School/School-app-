import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import * as yup from 'yup';

/**
 * TENANT ENFORCEMENT MIDDLEWARE
 * Ensures that all data submitted to the API belongs to the user's school context.
 */
export const enforceTenant = (schema?: yup.AnyObjectSchema) => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        const user = req.user;

        if (!user || !user.school_id) {
            console.error('❌ [SecurityException] User has no authorized school context.');
            return res.status(403).json({ error: 'SecurityException: Unauthorized school context.' });
        }

        // 1. Data Injection: If school_id is missing, inject it from the JWT
        if (req.method === 'POST' || req.method === 'PUT') {
            if (!req.body.school_id) {
                req.body.school_id = user.school_id;
                console.log(`ℹ️ [Tenant] Injected authorized school_id: ${user.school_id}`);
            }

            // 2. Cross-Tenant Check: If school_id is provided, it MUST match the JWT
            if (req.body.school_id !== user.school_id && user.role !== 'super_admin') {
                console.warn(`🚨 [SecurityException] Tenant Mismatch! User ${user.email} (School: ${user.school_id}) attempted to write to School: ${req.body.school_id}`);
                return res.status(403).json({ 
                    error: 'SecurityException: You do not have permission to modify data for this school.' 
                });
            }

            // 3. Schema Validation (if provided)
            if (schema) {
                try {
                    await schema.validate(req.body, { abortEarly: false });
                } catch (err: any) {
                    console.warn('⚠️ [Validation Error] Body failed schema check:', err.errors);
                    return res.status(400).json({ 
                        error: 'Validation Error', 
                        details: err.errors 
                    });
                }
            }
        }

        // 4. Branch Context Protection (Optional but Recommended)
        // If a branch_id is provided, verify it belongs to the school
        // (This would require a DB lookup or cached branch list)

        next();
    };
};

/**
 * Ensures that the authenticated user has a valid school_id (tenant context)
 */
export const requireTenant = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user || !user.school_id) {
        console.error('❌ [SecurityException] User has no authorized school context.');
        return res.status(403).json({ 
            error: 'SecurityException: Access denied. No valid school context found.' 
        });
    }

    next();
};

/**
 * RBAC Middleware: Check if user role matches allowed roles
 */
export const requireRole = (allowedRoles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        const user = req.user;

        if (!user || !allowedRoles.includes(user.role)) {
            console.warn(`🚨 [SecurityException] Role Mismatch! User ${user?.email} (${user?.role}) attempted restricted action.`);
            return res.status(403).json({ 
                error: `SecurityException: This action requires one of the following roles: ${allowedRoles.join(', ')}` 
            });
        }

        next();
    };
};
