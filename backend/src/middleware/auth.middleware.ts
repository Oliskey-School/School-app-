import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { config } from '../config/env';

export interface AuthRequest extends Request {
    user?: any;
}

export const DEMO_SCHOOL_ID = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
        console.warn('⚠️ [Auth] No authorization header provided');
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        const decoded: any = jwt.verify(token, config.jwtSecret);
        
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

            req.user = {
                id: decoded.id,
                email: decoded.email,
                role: decoded.role,
                school_id: DEMO_SCHOOL_ID,
                branch_id: decoded.branch_id,
                school_generated_id: decoded.school_generated_id,
                full_name: decoded.full_name,
                is_demo: true
            };
            console.log(`🛡️ [Auth] Demo token validated — identity: ${req.user.role} (${req.user.email})`);
            return next();
        }

        // REAL USER: Fetch from database
        const user = await (prisma.user.findUnique as any)({
            where: { id: decoded.id },
            include: {
                school: true,
                branch: true
            }
        });

        if (!user) {
            // User deleted — reject immediately, no ghost fallback
            console.error('❌ [Auth Error] User not found in database');
            return res.status(401).json({ message: 'User no longer exists' });
        }

        console.log(`✅ [Auth Success] User: ${user.email}`);

        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            school_id: user.school_id,
            branch_id: user.branch_id,
            school_generated_id: user.school_generated_id,
            full_name: user.full_name
        };

        next();
    } catch (error: any) {
        console.error('Auth Exception:', error.message);
        return res.status(401).json({ message: 'Authentication failed: ' + error.message });
    }
};
