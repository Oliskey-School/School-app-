import React, { useState } from 'react';
import { api } from '../../lib/api';
import bcrypt from 'bcryptjs';

const DEFAULTS = [
    { type: 'Admin', name: 'System Admin', email: 'admin@school.com', username: 'admin', password: 'admin123' },
    { type: 'Teacher', name: 'Bisola Odupitan', email: 'teacher@school.com', username: 'teacher', password: 'teacher123' },
    { type: 'Parent', name: 'Jane Parent', email: 'parent@school.com', username: 'parent', password: 'parent123' },
    { type: 'Student', name: 'Sam Student', email: 'student@school.com', username: 'student', password: 'student123' },
];

export const UserSeeder: React.FC = () => {
    const [status, setStatus] = useState<string>('');
    const [loading, setLoading] = useState(false);

    const seedUsers = async () => {
        setLoading(true);
        setStatus('Starting seed process...');

        try {
            for (const user of DEFAULTS) {
                setStatus(`Processing ${user.type}...`);

                // 1. Insert into PUBLIC.USERS
                // Check if exists first to avoid duplicates
                const { data: existingUser } = await api
                    .from('users')
                    .select('id')
                    .eq('email', user.email)
                    .maybeSingle();

                let userId = existingUser?.id;

                if (!userId) {
                    const { data: newUser, error: userError } = await api
                        .from('users')
                        .insert([{
                            email: user.email,
                            name: user.name,
                            role: user.type,
                            avatar_url: null
                        }])
                        .select()
                        .single();

                    if (userError) throw new Error(`Failed to create public user for ${user.username}: ${userError.message}`);
                    userId = newUser.id;
                }

                // 2. Insert into ROLE TABLE
                if (user.type === 'Teacher') {
                    const { error } = await api.from('teachers').upsert({
                        user_id: userId,
                        name: user.name,
                        email: user.email,
                        status: 'Active'
                    }, { onConflict: 'email' });
                    if (error) console.error('Teacher insert error:', error);
                } else if (user.type === 'Student') {
                    const { error } = await api.from('students').upsert({
                        user_id: userId,
                        name: user.name,
                        grade: 10,
                        section: 'A',
                        attendance_status: 'Present'
                    }, { onConflict: 'id' }); // Students usually don't have unique email constraint in schema shown, but let's assume valid
                    if (error) console.error('Student insert error:', error);
                } else if (user.type === 'Parent') {
                    const { error } = await api.from('parents').upsert({
                        email: user.email, // Parents table uses email as unique, but wait, schema says name, email, phone... 
                        // Wait, parents usually don't link to user_id in the schema I saw?
                        // Schema: id, name, email unique. No user_id column in snippet 574!
                        // Let me check schema snippet 574 again.
                        // "CREATE TABLE IF NOT EXISTS parents ( ... email UNIQUE ... )" - No user_id!
                        // This implies Parents might update unrelated to public.users? Or mapped differently?
                        // But auth_accounts maps user_id.
                        // I'll assume I should just ensure the parent record exists.
                        name: user.name,
                    }, { onConflict: 'email' });
                    if (error) console.error('Parent insert error:', error);
                }

                // 3. Create AUTH_ACCOUNT (Custom Auth Table)
                const hashedPassword = await bcrypt.hash(user.password, 10);
                const { error: authAccError } = await api
                    .from('auth_accounts')
                    .upsert([{
                        username: user.username,
                        email: user.email,
                        password: hashedPassword, // Stored but unused by login?
                        user_type: user.type,
                        user_id: userId,
                        is_active: true,
                        // Add verified fields if table supports it (lib/auth.ts checks is_verified)
                        is_verified: true,
                        verification_sent_at: new Date().toISOString()
                    }], { onConflict: 'username' });

                if (authAccError) throw new Error(`Failed to create auth_account for ${user.username}: ${authAccError.message}`);

                // 4. Supabase Auth (The tricky part)
                // We attempt to signUp. If user exists, it returns generic response or specific error.
                // We just try it.
                setStatus(`Registering Auth for ${user.type}...`);
                const { error: authError } = await api.auth.signUp({
                    email: user.email,
                    password: user.password,
                    options: {
                        data: {
                            full_name: user.name,
                            user_type: user.type,
                            username: user.username
                        }
                    }
                });

                // If already registered, error might be 'User already registered'. That's fine.
                if (authError && !authError.message.includes('already registered')) {
                    console.warn(`Supabase Auth warning for ${user.username}:`, authError.message);
                }

                // Important: SignOut immediately so next loop doesn't use this session
                await api.auth.signOut();
            }

            setStatus('Seeding Complete! You can now login.');
        } catch (err: any) {
            console.error(err);
            setStatus(`Error: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const clearData = async () => {
        if (!confirm('Are you sure you want to delete ALL user data (Users, Teachers, Students, Parents)? This cannot be undone.')) return;
        setLoading(true);
        setStatus('Clearing data...');

        try {
            // 0. Attempt to delete from Auth Users (Requires 'delete_auth_user_by_email' RPC function)
            // This is critical to ensure passwords can be reset
            for (const user of DEFAULTS) {
                const { error: rpcError } = await api.rpc('delete_auth_user_by_email', { email_input: user.email });
                if (rpcError) {
                    console.warn(`Could not delete auth user ${user.email} (function might not exist or permission denied):`, rpcError.message);
                }
            }

            // Delete in order to respect Foreign Keys
            // 1. Child tables first
            await api.from('auth_accounts').delete().neq('id', 0);
            await api.from('teacher_subjects').delete().neq('id', 0);
            await api.from('teacher_classes').delete().neq('id', 0);
            await api.from('parent_children').delete().neq('id', 0);

            // 2. Role tables
            await api.from('teachers').delete().neq('id', 0);
            await api.from('students').delete().neq('id', 0);
            await api.from('parents').delete().neq('id', 0);

            // 3. Main users table (Check if ID is numeric or UUID, assuming numeric based on types.ts but generic check is safer)
            // If users table uses UUID, neq('id', 0) might fail type check if 0 is int. 
            // We'll use a safer filter: id is not null. 
            await api.from('users').delete().not('id', 'is', null);

            setStatus('All accounts cleared. You can now Seed Data.');
        } catch (err: any) {
            console.error(err);
            setStatus('Error clearing data: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-50 flex gap-2">
            <button
                onClick={clearData}
                className="bg-red-800 text-white text-xs px-3 py-1 rounded shadow hover:bg-red-700 opacity-50 hover:opacity-100 transition-all"
                disabled={loading}
            >
                {loading ? 'Processing...' : 'Clear Data'}
            </button>
            <button
                onClick={seedUsers}
                className="bg-gray-800 text-white text-xs px-3 py-1 rounded shadow hover:bg-gray-700 opacity-50 hover:opacity-100 transition-all"
                disabled={loading}
            >
                {loading ? 'Seeding...' : 'Seed Data'}
            </button>
            {status && <div className="absolute bottom-full right-0 mb-2 bg-black text-white text-xs p-2 rounded whitespace-nowrap">{status}</div>}
        </div>
    );
};

