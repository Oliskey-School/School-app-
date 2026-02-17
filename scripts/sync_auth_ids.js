
const { createClient } = require('@supabase/supabase-js');
try { require('dotenv').config(); } catch (e) { }

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncAuthIds() {
    console.log('--- Starting Auth ID Synchronization ---');

    // 1. Fetch all users from Auth
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
        console.error('Error fetching auth users:', usersError);
        return;
    }

    console.log(`Found ${users.length} auth users.`);

    let updatedCount = 0;

    for (const user of users) {
        const email = user.email;
        if (!email) continue;

        let roleData = null;
        let role = '';

        // Try getting user role from metadata to optimize
        const metaRole = user.user_metadata?.role || user.app_metadata?.role;

        // Query potentially matching tables
        // We check all 4 tables just in case email exists in one but metadata is wrong
        const checks = [
            { table: 'students', role: 'student' },
            { table: 'parents', role: 'parent' },
            { table: 'teachers', role: 'teacher' },
            { table: 'admins', role: 'admin' }
        ];

        for (const check of checks) {
            const { data, error } = await supabase
                .from(check.table)
                .select('school_generated_id, id')
                .eq('email', email)
                .maybeSingle();

            if (data) {
                roleData = data;
                role = check.role;
                break;
            }
        }

        if (roleData && roleData.school_generated_id) {
            const currentMetaId = user.user_metadata?.school_generated_id;

            if (currentMetaId !== roleData.school_generated_id) {
                console.log(`Syncing User ${email}: ${currentMetaId || '(none)'} -> ${roleData.school_generated_id}`);

                const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
                    user_metadata: {
                        ...user.user_metadata,
                        school_generated_id: roleData.school_generated_id,
                        schoolId: roleData.school_generated_id, // Backward compat
                        role: role // Ensure role is set
                    }
                });

                if (updateError) {
                    console.error(`Failed to update ${email}:`, updateError);
                } else {
                    updatedCount++;
                }
            }
        } else {
            console.log(`No DB record found for ${email} (Auth ID: ${user.id})`);
        }
    }

    console.log(`--- Sync Complete. Updated ${updatedCount} users. ---`);
}

syncAuthIds();
