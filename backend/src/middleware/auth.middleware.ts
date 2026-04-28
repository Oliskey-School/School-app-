import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { config } from '../config/env';

export interface AuthRequest extends Request {
    user?: any;
}

export const DEMO_SCHOOL_ID = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    // Lead DevSecOps: Extract from secure HttpOnly cookies, fallback to Bearer for mobile/API clients
    let token = req.cookies?.access_token;
    
    if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }
    }

    if (!token) {
        console.warn('⚠️ [Auth] No authorization token provided');
        return res.status(401).json({ message: 'Authentication token missing' });
    }

    try {
        // VULNERABILITY MITIGATION: Strictly enforce the signature algorithm
        const decoded: any = jwt.verify(token, config.jwtSecret, {
            algorithms: ['HS256'] // Rejects algorithm: "none" or asymmetric confusion
        });
        
        if (!decoded || !decoded.id) {
            return res.status(401).json({ message: 'Invalid token payload' });
        }

        // DEMO TOKEN: Validate that demo tokens can only access the demo school
        if (decoded.is_demo === true) {
            const requestedSchoolId = (req.headers['x-school-id'] as string) ||
                (req.query.schoolId as string) || (req.query.school_id as string) ||
                (req.body?.school_id as string) || (req.body?.schoolId as string);

            // If a school ID is explicitly requested, it MUST be the demo school
            if (requestedSchoolId && requestedSchoolId !== DEMO_SCHOOL_ID) {
                console.warn('🚨 [Auth] Demo token attempted to access non-demo school:', requestedSchoolId);
                return res.status(403).json({ message: 'Demo tokens can only access the demo school' });
            }

            // Fetch demo school details to ensure name updates persist
            const demoSchool = await prisma.school.findUnique({
                where: { id: DEMO_SCHOOL_ID }
            });

            req.user = {
                id: decoded.id,
                email: decoded.email,
                role: decoded.role,
                school_id: DEMO_SCHOOL_ID,
                branch_id: decoded.branch_id,
                allowed_branch_ids: decoded.allowed_branch_ids || [],
                school_generated_id: decoded.school_generated_id,
                full_name: decoded.full_name,
                is_demo: true,
                school: demoSchool // Add school object
            };
            console.log(`🛡️ [Auth] Demo token validated — identity: ${req.user.role} (${req.user.email})`);
            return next();
        }

        // REAL USER: Fetch from database
        const user = await (prisma.user.findUnique as any)({
            where: { id: decoded.id },
            include: {
                school: true,
                branch: true,
                teacher_profile: true,
                parent_profile: true
            }
        });

        if (!user) {
            // User deleted — reject immediately, no ghost fallback
            console.error('❌ [Auth Error] User not found in database');
            return res.status(401).json({ message: 'User no longer exists' });
        }

        console.log(`✅ [Auth Success] User: ${user.email}`);

        // Extract phone from whichever profile is available
        const phone = user.teacher_profile?.phone || user.parent_profile?.phone || null;

        // Return the role-specific school_generated_id so that the Admin dashboard
        // does not accidentally display a teacher's ID stored in the User row.
        const roleAwareGeneratedId = (() => {
            const r = (user.role || '').toUpperCase();
            if (r === 'TEACHER' && user.teacher_profile?.school_generated_id) {
                return user.teacher_profile.school_generated_id;
            }
            if (r === 'PARENT' && user.parent_profile?.school_generated_id) {
                return user.parent_profile.school_generated_id;
            }
            // For ADMIN, SUPER_ADMIN, PROPRIETOR etc. — use User.school_generated_id as-is
            return user.school_generated_id;
        })();

        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            school_id: user.school_id,
            branch_id: user.branch_id,
            allowed_branch_ids: user.allowed_branch_ids || [],
            school_generated_id: roleAwareGeneratedId,
            full_name: user.full_name,
            phone: phone, 
            avatar_url: user.avatar_url,
            email_verified: user.email_verified, // Added for frontend checks
            school: user.school,
            branch: user.branch,
            teacher_profile: user.teacher_profile,
            parent_profile: user.parent_profile
        };

        next();
    } catch (error: any) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ code: 'TOKEN_EXPIRED', message: 'Session expired' });
        }
        console.error('🚨 [Security] Auth Exception [FULL]:', error);
        return res.status(401).json({ message: 'Authentication failed: ' + error.message });
    }
};
