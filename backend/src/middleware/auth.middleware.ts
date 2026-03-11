import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase';
import { config } from '../config/env';

export interface AuthRequest extends Request {
    user?: any;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    // [DEMO BYPASS] Allow anonymous access for the Demo School (d0ff3e95-9b4c-4c12-989c-e5640d3cacd1)
    // This ensures visitors clicking "Try Demo" get a working dashboard even if 
    // real Supabase auth is currently having issues in their environment.
    const DEMO_SCHOOL_ID = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';
    const requestedSchoolId = (req.headers['x-school-id'] as string) ||
        (req.query.schoolId as string) || (req.query.school_id as string) ||
        (req.body?.school_id as string) || (req.body?.schoolId as string);

    if (!token && requestedSchoolId === DEMO_SCHOOL_ID) {
        console.log('🛡️ [Auth] Demo School Bypass — providing limited demo identity');
        req.user = {
            id: '014811ea-281f-484e-b039-e37beb8d92b2', // Admin ID
            email: 'user@school.com',
            role: 'admin',
            school_id: DEMO_SCHOOL_ID,
            branch_id: '7601cbea-e1ba-49d6-b59b-412a584cb94f'
        };
        return next();
    }

    if (!token) {
        console.warn('⚠️ [Auth] No authorization header provided');
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        // 1. First try verifying with local secret (Mock/Test Tokens)
        try {
            const decoded = jwt.verify(token, config.jwtSecret);
            if (decoded) {
                console.log(`✅ [Auth Success] (Local JWT) User: ${(decoded as any).email}`);
                req.user = decoded;
                return next();
            }
        } catch (localError) {
            // Not a local token, continue to Supabase
        }

        // 2. Verify token with Supabase Auth API (Real Users)
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            if (requestedSchoolId === DEMO_SCHOOL_ID) {
                console.log('🛡️ [Auth] Demo School Bypass (Invalid Token) — providing limited demo identity');
                req.user = {
                    id: '014811ea-281f-484e-b039-e37beb8d92b2', // Admin ID
                    email: 'user@school.com',
                    role: 'admin',
                    school_id: DEMO_SCHOOL_ID,
                    branch_id: '7601cbea-e1ba-49d6-b59b-412a584cb94f'
                };
                return next();
            }

            console.error('❌ [Auth Error] Token validation failed:', error?.message);
            return res.status(401).json({ message: 'Invalid token' });
        }

        console.log(`✅ [Auth Success] (Supabase) User: ${user.email}`);

        // Fetch additional profile data (role, school_id) to populate req.user
        const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

        // Attach user + profile data to request.
        // Explicit field extraction ensures branch_id / role are always set
        // even if the profile lookup returns null (e.g. new user race condition).
        req.user = {
            ...user,
            ...profile,
            school_id: profile?.school_id || user.user_metadata?.school_id || user.app_metadata?.school_id,
            branch_id: profile?.branch_id || user.user_metadata?.branch_id || user.app_metadata?.branch_id || null,
            role: profile?.role || user.user_metadata?.role || user.app_metadata?.role,
            school_generated_id: profile?.school_generated_id || user.user_metadata?.school_generated_id || null,
        };

        next();
    } catch (error) {
        console.error('Auth Exception:', error);
        return res.status(401).json({ message: 'Authentication failed' });
    }
};
