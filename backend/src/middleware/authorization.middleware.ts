import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import prisma from '../config/database';

/**
 * Lead DevSecOps: IDOR Protection Middleware
 * Verifies that a resource exists, belongs to the user's school (tenant),
 * and matches the user's role-based access requirements BEFORE the main controller logic.
 */
export const authorizeResource = (
    modelName: 'student' | 'teacher' | 'class' | 'exam' | 'grade' | 'assignment',
    idParam: string = 'id',
    options: {
        ownerField?: string; // Field that links resource to a user ID (e.g., 'teacher_id')
        allowAdmin?: boolean; // If true, Admins bypass ownership check within their school
    } = { allowAdmin: true }
) => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        const user = req.user;
        const resourceId = req.params[idParam];

        if (!user || !user.school_id) {
            return res.status(401).json({ error: 'SecurityException: Authentication required.' });
        }

        if (!resourceId) {
            return res.status(400).json({ error: 'SecurityException: Resource ID missing.' });
        }

        try {
            // 1. Fetch the resource with tenant and ownership context
            // We use the raw prisma client here for a "Pre-flight" check
            const resource = await (prisma as any)[modelName].findFirst({
                where: {
                    id: resourceId,
                    school_id: user.school_id, // STRICT Multi-tenant isolation
                }
            });

            // 2. EXISTENCE & TENANT CHECK: If not found, it either doesn't exist or belongs to another school.
            // Return 404 to prevent ID enumeration/probing.
            if (!resource) {
                console.warn(`🚨 [IDOR-ATTEMPT] User ${user.email} attempted to access non-existent or unauthorized ${modelName}: ${resourceId}`);
                return res.status(404).json({ error: 'Resource not found.' });
            }

            // 3. ROLE-BASED OWNERSHIP CHECK
            const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'PROPRIETOR'].includes(user.role);
            
            if (options.allowAdmin && isAdmin) {
                // Admin has full access within their school
                (req as any).authorizedResource = resource;
                return next();
            }

            // If an ownerField is specified (e.g., 'teacher_id' on an exam), verify it matches the user
            if (options.ownerField) {
                const ownerId = resource[options.ownerField];
                
                // For Teachers: Check if they own the resource
                if (user.role === 'TEACHER' && ownerId !== user.id) {
                    console.warn(`🚨 [IDOR-BLOCK] Teacher ${user.email} attempted to access ${modelName} owned by ${ownerId}`);
                    return res.status(403).json({ error: 'SecurityException: Access Denied. You do not own this resource.' });
                }

                // For Students: Check if the resource (like a Grade) belongs to them
                if (user.role === 'STUDENT' && ownerId !== user.id) {
                    console.warn(`🚨 [IDOR-BLOCK] Student ${user.email} attempted to access ${modelName} belonging to ${ownerId}`);
                    return res.status(403).json({ error: 'SecurityException: Access Denied.' });
                }
            }

            // Attach the authorized resource to the request to avoid redundant DB calls in the controller
            (req as any).authorizedResource = resource;
            next();
        } catch (error: any) {
            console.error(`🔥 [Authorization Error] ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error during authorization.' });
        }
    };
};
