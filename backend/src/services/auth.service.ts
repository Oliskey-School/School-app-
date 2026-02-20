import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { supabase } from '../config/supabase';
import { config } from '../config/env';

export class AuthService {
    static async signup(data: any) {
        // 1. Check if user exists (mocked or real DB check)
        // 2. Hash password
        const hashedPassword = await bcrypt.hash(data.password, 10);

        // 3. Create user in DB
        const { data: user, error } = await supabase
            .from('users')
            .insert([{
                email: data.email,
                password_hash: hashedPassword, // Storing hash, NOT plain password
                role: data.role || 'Student',
                school_id: data.school_id,
                full_name: data.full_name
            }])
            .select()
            .single();

        if (error) throw new Error(error.message);
        return user;
    }

    static async login(email: string, password: string) {
        // 0. Handle Demo Login
        const isDemoAccount = email.endsWith('@demo.com') || email.includes('demo_');
        if (isDemoAccount && password === 'password123') {
            // Return a mock demo user based on the email
            const role = email.split('@')[0].replace('demo_', '');
            const demoUser = {
                id: `demo-${role}-id`,
                email: email,
                role: role.charAt(0).toUpperCase() + role.slice(1),
                school_id: 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1',
                full_name: `Demo ${role.charAt(0).toUpperCase() + role.slice(1)}`
            };
            const token = jwt.sign(demoUser, config.jwtSecret, { expiresIn: '1d' });
            return { user: demoUser, token };
        }

        // 1. Find user
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !user) throw new Error('Invalid credentials');

        // 2. Compare password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) throw new Error('Invalid credentials');

        // 3. Generate Token
        const payload = {
            id: user.id,
            email: user.email,
            role: user.role,
            school_id: user.school_id
        };

        const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '1d' });

        return { user, token };
    }
    static async createUser(data: any) {
        // 1. Hash Password
        const hashedPassword = await bcrypt.hash(data.password, 10);

        // 2. Normalize Role to lowercase for Postgres Enum compatibility
        const normalizedRole = data.role ? data.role.toLowerCase() : 'student';

        // 3. Initialize Admin Client to bypass RLS for internal user creations
        const { createClient } = require('@supabase/supabase-js');
        const supabaseAdmin = createClient(
            config.supabaseUrl,
            process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabaseServiceKey
        );

        // 4. Create Supabase Auth User (Auto-confirmed)
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: data.email,
            password: data.password,
            email_confirm: true,
            user_metadata: {
                full_name: data.full_name,
                role: normalizedRole,
                school_id: data.school_id,
                username: data.username
            }
        });

        if (authError) throw new Error(`Supabase Auth Error: ${authError.message}`);
        const userId = authData.user.id;

        // 5. Upsert into public.users (Sync ID)
        // Note: password_hash column is removed since Supabase Auth handles it natively
        const { error: userError } = await supabaseAdmin
            .from('users')
            .upsert({
                id: userId,
                email: data.email,
                role: normalizedRole,
                school_id: data.school_id,
                full_name: data.full_name, // Removed password_hash
                name: data.full_name
            });

        if (userError) {
            // Fallback: If ID mismatch (e.g., users.id is int), try letting DB generate ID
            const { error: retryError } = await supabaseAdmin.from('users').insert({
                email: data.email,
                role: normalizedRole, // Removed password_hash
                school_id: data.school_id,
                full_name: data.full_name
            });
            if (retryError) throw new Error(`User DB Error: ${userError.message}`);
        }

        // 6. Update auth_accounts (for username login)
        const { error: accountError } = await supabaseAdmin
            .from('auth_accounts')
            .upsert({
                username: data.username,
                email: data.email,
                school_id: data.school_id,
                is_verified: true,
                user_id: userId
            });

        if (accountError) console.warn('Auth Account Sync Warning:', accountError.message);

        return { id: userId, email: data.email, username: data.username };
    }
}
