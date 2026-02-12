const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function fixProfiles() {
    // Load env
    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';
    try {
        envContent = fs.readFileSync(envPath, 'utf8');
    } catch (e) {
        console.error('.env file not found');
        process.exit(1);
    }

    const envVars = {};
    envContent.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const val = parts.slice(1).join('=').trim();
            envVars[key] = val;
        }
    });

    const supabaseUrl = envVars['VITE_SUPABASE_URL'];
    const supabaseKey = envVars['SUPABASE_SERVICE_ROLE_KEY'] || envVars['VITE_SUPABASE_ANON_KEY'];

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing Supabase URL or Key');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Syncing profiles from public.users table...');
    const { data: users, error: userError } = await supabase.from('users').select('*');
    if (userError) {
        console.error('Error fetching users:', userError);
        return;
    }

    const profilesToInsert = users.map(u => ({
        id: u.id,
        school_id: u.school_id || '00000000-0000-0000-0000-000000000000',
        email: u.email,
        full_name: u.full_name || u.name || u.email,
        role: u.role || 'student'
    }));

    const { error: profileError } = await supabase.from('profiles').upsert(profilesToInsert, { onConflict: 'id' });
    if (profileError) {
        console.error('Error syncing profiles:', profileError);
    } else {
        console.log(`Successfully synced ${profilesToInsert.length} profiles.`);
    }
}

fixProfiles();