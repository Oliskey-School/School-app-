import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { supabase } from '../config/supabase';
import { config } from '../config/env';
import { IdGeneratorService } from './idGenerator.service';

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
                branch_id: data.branch_id || null,
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

            // USE VALID UUIDs for demo accounts to satisfy PG schema
            const demoIdMap: { [key: string]: string } = {
                'admin': 'd3300000-0000-0000-0000-000000000001',
                'teacher': 'd3300000-0000-0000-0000-000000000002',
                'parent': 'd3300000-0000-0000-0000-000000000003',
                'student': 'd3300000-0000-0000-0000-000000000004'
            };

            const demoUser = {
                id: demoIdMap[role] || `d3300000-0000-0000-0000-000000000005`,
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
            school_id: user.school_id,
            email_verified: user.email_verified || false
        };

        const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '1d' });

        return { user: { ...user, email_verified: user.email_verified || false }, token };
    }
    static async createUser(data: any) {
        const { createClient } = require('@supabase/supabase-js');
        const supabaseAdmin = createClient(
            config.supabaseUrl,
            process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabaseServiceKey
        );

        // 1. Check if email already exists in public.users (which reflects auth.users)
        const { data: existingUser, error: searchError } = await supabaseAdmin
            .from('users')
            .select('id, email_verified')
            .eq('email', data.email.toLowerCase())
            .maybeSingle();

        let userId: string;
        let isExisting = false;

        if (existingUser) {
            userId = existingUser.id;
            isExisting = true;
            console.log(`[AUTH] Linking existing user ${data.email} to new schoolId: ${data.school_id}`);
        } else {
            // 2. Hash Password for our internal users table (only for new users)
            const hashedPassword = await bcrypt.hash(data.password, 10);

            // 3. Normalize Role to lowercase
            const normalizedRole = data.role ? data.role.toLowerCase() : 'student';

            // 4. Create Supabase Auth User
            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email: data.email,
                password: data.password,
                email_confirm: true,
                user_metadata: {
                    full_name: data.full_name,
                    role: normalizedRole,
                    school_id: data.school_id,
                    branch_id: data.branch_id || null,
                    username: data.username
                }
            });

            if (authError) throw new Error(`Supabase Auth Error: ${authError.message}`);
            userId = authData.user.id;

            // 5. Update public.users password_hash
            await supabaseAdmin
                .from('users')
                .update({
                    password_hash: hashedPassword,
                    email_verified: false,
                    branch_id: data.branch_id || null
                })
                .eq('id', userId);
        }

        // 6. Ensure membership exists in school_memberships
        const { error: membershipError } = await supabaseAdmin
            .from('school_memberships')
            .upsert({
                school_id: data.school_id,
                user_id: userId,
                base_role: data.role ? data.role.toLowerCase() : 'student',
                is_active: true
            });

        if (membershipError) console.warn('Membership Sync Warning:', membershipError.message);

        // 7. Update auth_accounts (for username login)
        const { error: accountError } = await supabaseAdmin
            .from('auth_accounts')
            .upsert({
                username: data.username.toLowerCase(),
                email: data.email.toLowerCase(),
                school_id: data.school_id,
                is_verified: isExisting ? existingUser.email_verified : false,
                user_id: userId
            });

        if (accountError) console.warn('Auth Account Sync Warning:', accountError.message);

        // 8. Generate standard school ID for this user
        const normalizedRoleForTable = data.role ? data.role.toLowerCase() : 'student';
        let schoolGeneratedId: string | undefined;
        if (data.school_id && data.branch_id) {
            try {
                schoolGeneratedId = await IdGeneratorService.generateSchoolId(
                    data.school_id,
                    data.branch_id,
                    normalizedRoleForTable
                );
                // Write the ID to the users table
                await supabaseAdmin
                    .from('users')
                    .update({ school_generated_id: schoolGeneratedId })
                    .eq('id', userId);
            } catch (idErr: any) {
                console.warn('[AuthService] Could not generate school ID:', idErr.message);
            }
        }

        // 9. Create role-specific record (Teachers/Parents/Students) if missing for THIS school
        const tableName = normalizedRoleForTable === 'teacher' ? 'teachers' :
            normalizedRoleForTable === 'parent' ? 'parents' :
                normalizedRoleForTable === 'student' ? 'students' : null;

        if (tableName) {
            const { data: profileExists } = await supabaseAdmin
                .from(tableName)
                .select('id')
                .eq('school_id', data.school_id)
                .eq(tableName === 'students' ? 'id' : 'user_id', userId)
                .maybeSingle();

            if (!profileExists) {
                const profileData: any = {
                    school_id: data.school_id,
                    full_name: data.full_name,
                    email: data.email,
                    branch_id: data.branch_id || null,
                    school_generated_id: schoolGeneratedId || null
                };
                if (tableName === 'students') profileData.id = userId;
                else profileData.user_id = userId;

                await supabaseAdmin.from(tableName).insert([profileData]);
            }
        }

        return {
            id: userId,
            email: data.email,
            username: data.username,
            schoolGeneratedId: schoolGeneratedId || null,
            email_verified: isExisting ? existingUser.email_verified : false,
            linked: isExisting
        };
    }

    static async resendVerification(email: string) {
        console.log(`[AUTH] Resending verification email to ${email}`);
        const { createClient } = require('@supabase/supabase-js');
        const supabaseAdmin = createClient(
            config.supabaseUrl,
            process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabaseServiceKey
        );

        const { error } = await supabaseAdmin.auth.resend({ type: 'signup', email });

        if (error) throw new Error(`Resend Error: ${error.message}`);
        return { success: true, message: 'Verification email sent successfully' };
    }

    static async confirmEmail(userId: string) {
        const { createClient } = require('@supabase/supabase-js');
        const supabaseAdmin = createClient(
            config.supabaseUrl,
            process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabaseServiceKey
        );

        // Fetch user from auth.users to get the newly verified email
        const { data: { user }, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (fetchError || !user) throw new Error(`User auth data sync failed.`);

        const verifiedEmail = user.email;

        // Sync to public.users
        const { error: userError } = await supabaseAdmin
            .from('users')
            .update({ email: verifiedEmail, email_verified: true })
            .eq('id', userId);

        if (userError) throw new Error(`Confirmation User Sync Error: ${userError.message}`);

        // Sync to auth_accounts
        const { error: accError } = await supabaseAdmin
            .from('auth_accounts')
            .update({ email: verifiedEmail, is_verified: true })
            .eq('user_id', userId);

        if (accError) console.warn('Account Verification Sync Warning:', accError.message);

        // Cascade to role-specific tables (students, teachers, parents)
        const tables = ['students', 'teachers', 'parents'];
        for (const table of tables) {
            const idField = table === 'students' ? 'id' : 'user_id';
            await supabaseAdmin
                .from(table)
                .update({ email: verifiedEmail })
                .eq(idField, userId);
        }

        return { success: true, message: 'Email confirmed successfully' };
    }

    static async updateEmail(userId: string, newEmail: string) {
        // Handle Demo Users
        if (userId.startsWith('d33000')) {
            return { success: true, message: 'Email updated successfully (Demo Mode)' };
        }

        const { createClient } = require('@supabase/supabase-js');
        const supabaseAdmin = createClient(
            config.supabaseUrl,
            process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabaseServiceKey
        );

        console.log(`[AUTH] Updating email for user ${userId} to ${newEmail}`);

        // 1. Update Supabase Auth (set to unconfirmed so we can send a new verification email)
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            email: newEmail,
            email_confirm: false
        });
        if (authError) throw new Error(`Auth Update Error: ${authError.message}`);

        // 2. Trigger verification email to the new address
        const { error: resendError } = await supabaseAdmin.auth.resend({
            type: 'signup',
            email: newEmail
        });
        if (resendError) console.warn('[AUTH] Failed to trigger resend after email update:', resendError.message);

        // 3. Update public.users
        const { error: userError } = await supabaseAdmin
            .from('users')
            .update({ email: newEmail, email_verified: false })
            .eq('id', userId);
        if (userError) throw new Error(`User Table Update Error: ${userError.message}`);

        // 4. Update auth_accounts
        const { error: accError } = await supabaseAdmin
            .from('auth_accounts')
            .update({ email: newEmail, is_verified: false })
            .eq('user_id', userId);
        if (accError) console.warn('[AUTH] auth_accounts sync warning:', accError.message);

        // 5. Cascade to role-specific tables (students, teachers, parents)
        const tables = ['students', 'teachers', 'parents'];
        for (const table of tables) {
            const idField = table === 'students' ? 'id' : 'user_id';
            await supabaseAdmin
                .from(table)
                .update({ email: newEmail })
                .eq(idField, userId);
        }

        return { success: true, message: 'Email updated successfully. Please verify your new email.' };
    }

    static async updateUsername(userId: string, newUsername: string) {
        // Handle Demo Users
        if (userId.startsWith('d33000')) {
            return { success: true, message: 'Username updated successfully (Demo Mode)' };
        }

        const { createClient } = require('@supabase/supabase-js');
        const supabaseAdmin = createClient(
            config.supabaseUrl,
            process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabaseServiceKey
        );

        // 1. Check if username taken
        const { data: existing } = await supabaseAdmin
            .from('auth_accounts')
            .select('id')
            .eq('username', newUsername.toLowerCase())
            .maybeSingle();

        if (existing) throw new Error('Username already taken');

        // 2. Update auth_accounts
        const { error } = await supabaseAdmin
            .from('auth_accounts')
            .update({ username: newUsername.toLowerCase() })
            .eq('user_id', userId);

        if (error) throw new Error(`Username Update Error: ${error.message}`);

        // 3. Sync to user metadata if needed
        await supabaseAdmin.auth.admin.updateUserById(userId, {
            user_metadata: { username: newUsername }
        });

        return { success: true, message: 'Username updated successfully' };
    }

    static async updatePassword(userId: string, newPassword: string) {
        // Handle Demo Users
        if (userId.startsWith('d33000')) {
            return { success: true, message: 'Password updated successfully (Demo Mode)' };
        }

        const { createClient } = require('@supabase/supabase-js');
        const supabaseAdmin = createClient(
            config.supabaseUrl,
            process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabaseServiceKey
        );

        // 1. Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // 2. Update Supabase Auth
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            password: newPassword
        });
        if (authError) throw new Error(`Auth Password Update Error: ${authError.message}`);

        // 3. Update public.users
        const { error: userError } = await supabaseAdmin
            .from('users')
            .update({ password_hash: hashedPassword })
            .eq('id', userId);
        if (userError) throw new Error(`User Password Update Error: ${userError.message}`);

        return { success: true, message: 'Password updated successfully' };
    }

    static async getMemberships(userId: string) {
        const { data, error } = await supabase
            .from('school_memberships')
            .select('school_id, schools(*), base_role')
            .eq('user_id', userId)
            .eq('is_active', true);

        if (error) throw new Error(error.message);
        return data;
    }

    static async switchSchool(userId: string, schoolId: string) {
        // 1. Verify membership
        const { data: membership, error: memError } = await supabase
            .from('school_memberships')
            .select('*')
            .eq('user_id', userId)
            .eq('school_id', schoolId)
            .eq('is_active', true)
            .maybeSingle();

        if (memError || !membership) throw new Error('Not a member of this school');

        // 2. Get user info
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (userError || !user) throw new Error('User not found');

        // 3. Update Supabase Auth app_metadata if not demo
        if (!userId.startsWith('d33000')) {
            const { createClient } = require('@supabase/supabase-js');
            const supabaseAdmin = createClient(
                config.supabaseUrl,
                process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabaseServiceKey
            );

            await supabaseAdmin.auth.admin.updateUserById(userId, {
                app_metadata: { school_id: schoolId, role: membership.base_role }
            });
        }

        // 4. Generate new token
        const payload = {
            id: user.id,
            email: user.email,
            role: membership.base_role,
            school_id: schoolId,
            email_verified: user.email_verified || false
        };

        const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '1d' });
        return { token, user: { ...user, role: membership.base_role, school_id: schoolId } };
    }
}
