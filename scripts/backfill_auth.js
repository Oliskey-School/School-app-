
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

// Duplicate logic from auth.ts temporarily to avoid import issues
const generateUsername = (fullName, userType) => {
    return `${userType.charAt(0).toLowerCase()}${fullName.toLowerCase().trim().replace(/\s+/g, '.')}`;
};
const generatePassword = (surname) => `password123`; // Default for repair

async function backfillAuth() {
    console.log("Starting Backfill of Auth Accounts...");

    // 1. Fetch ALL users
    const { data: users, error: uErr } = await supabase.from('users').select('*');
    if (uErr) {
        console.error("Error fetching users:", uErr);
        return;
    }
    console.log(`Found ${users.length} users in 'users' table.`);

    // 2. Fetch ALL auth_accounts
    const { data: auths, error: aErr } = await supabase.from('auth_accounts').select('email');
    if (aErr) {
        console.error("Error fetching auth_accounts:", aErr);
        // Continue if empty/error?
    }
    const existingEmails = new Set(auths?.map(a => a.email) || []);

    let fixedCount = 0;

    // 3. Loop and create missing
    for (const user of users) {
        if (!existingEmails.has(user.email)) {
            console.log(`Backfilling auth for: ${user.name} (${user.email})`);
            try {
                // Generate credentials
                const nameParts = user.name.trim().split(/\s+/);
                const surname = nameParts[nameParts.length - 1] || 'user';
                const username = generateUsername(user.name, user.role || 'Student');
                const password = generatePassword(surname); // default
                const hashedPassword = await bcrypt.hash(password, 10);

                // Insert directly to auth_accounts (skipping Supabase Auth signUp to avoid "User already exists" error if they are in 'auth.users' but not 'auth_accounts')
                // Ideally we should check auth.users too, but we can't easily.

                const now = new Date();
                const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

                const { error: insertErr } = await supabase
                    .from('auth_accounts')
                    .insert([{
                        username: username,
                        password: hashedPassword,
                        user_type: user.role || 'Student',
                        email: user.email,
                        user_id: user.id,
                        is_active: true,
                        is_verified: true, // Auto-verify backfilled accounts?
                        verification_sent_at: now.toISOString(),
                        verification_expires_at: expires.toISOString(),
                    }]);

                if (insertErr) {
                    console.error(`Failed to insert auth for ${user.email}:`, insertErr.message);
                } else {
                    console.log(`  -> Success! Username: ${username} / Password: ${password}`);
                    fixedCount++;
                }

            } catch (err) {
                console.error(`  -> Error processing ${user.email}:`, err);
            }
        } else {
            // Check if user_id is linked?
            // Optional
        }
    }

    console.log(`Backfill complete. Fixed ${fixedCount} accounts.`);
}

backfillAuth();
