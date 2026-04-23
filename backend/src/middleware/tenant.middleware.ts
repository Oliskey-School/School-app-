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
            // Default to demo school if no school context is present
            const defaultSchoolId = process.env.DEFAULT_SCHOOL_ID || 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';
            if (user) user.school_id = defaultSchoolId;
            console.warn('ℹ️ [Tenant] No authorized school context. Defaulting to Demo School.');
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

        // 4. Branch Isolation Enforcement
        const branchId = req.headers['x-branch-id'] as string;
        
        if (branchId && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN' && user.role !== 'PROPRIETOR') {
            const allowedBranches = user.allowed_branch_ids || [];
            
            // For Roles like Teacher - they must be in their allowed list
            if (user.role === 'TEACHER' && !allowedBranches.includes(branchId)) {
                console.warn(`🚨 [SecurityException] Branch Mismatch! Teacher ${user.email} attempted to access unauthorized Branch: ${branchId}`);
                return res.status(403).json({ error: 'SecurityException: You do not have permission to access this branch.' });
            }

            // For Roles like Student - they are strictly locked to their one branch
            if (user.role === 'STUDENT' && user.branch_id && branchId !== user.branch_id) {
                console.warn(`🚨 [SecurityException] Branch Mismatch! Student ${user.email} attempted to bypass Branch Lock: ${branchId}`);
                return res.status(403).json({ error: 'SecurityException: You are locked to your assigned branch.' });
            }
        }

        // 5. Data Injection: If branch_id is missing in body but present in header, inject it
        if ((req.method === 'POST' || req.method === 'PUT') && branchId && !req.body.branch_id) {
            req.body.branch_id = branchId;
        }

        next();
    };
};

/**
 * Ensures that the authenticated user has a valid school_id (tenant context)
 */
export const requireTenant = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Allow SuperAdmins to bypass tenant requirement for global actions (like SaaS dashboard)
    if (user.role === 'SUPER_ADMIN' || user.role === 'super_admin') {
        return next();
    }

    if (!user.school_id) {
        const defaultSchoolId = process.env.DEFAULT_SCHOOL_ID || 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';
        user.school_id = defaultSchoolId;
        console.warn('ℹ️ [Tenant] No authorized school context for user. Defaulting to Demo School.');
    }

    next();
};

/**
 * RBAC Middleware: Check if user role matches allowed roles
 */
export const requireRole = (allowedRoles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        const user = req.user;

        if (!user) {
            console.warn(`🚨 [SecurityException] No user found in request`);
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Normalize both user role and allowed roles to lowercase for comparison
        const userRoleLower = user.role.toLowerCase();
        const allowedRolesLower = allowedRoles.map(role => role.toLowerCase());

        if (!allowedRolesLower.includes(userRoleLower)) {
            console.warn(`🚨 [SecurityException] Role Mismatch! User ${user?.email} (${user?.role}) attempted restricted action.`);
            return res.status(403).json({ 
                error: `SecurityException: This action requires one of the following roles: ${allowedRoles.join(', ')}` 
            });
        }

        next();
    };
};
