import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase';
import { config } from '../config/env';

export interface AuthRequest extends Request {
    user?: any;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        console.warn('⚠️ [Auth] No authorization header provided');
        return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

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
            console.error('❌ [Auth Error] Token validation failed:', error?.message);
            return res.status(401).json({ message: 'Invalid token' });
        }

        console.log(`✅ [Auth Success] (Supabase) User: ${user.email}`);

        // Fetch additional profile data (role, school_id) to populate req.user
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        // Attach user + profile data to request
        req.user = {
            ...user,
            ...profile, // This adds school_id, role, etc.
            school_id: profile?.school_id || (user.user_metadata?.school_id)
        };

        next();
    } catch (error) {
        console.error('Auth Exception:', error);
        return res.status(401).json({ message: 'Authentication failed' });
    }
};
