const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function debugProfiles() {
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
    envContent.split(/\r?\n/).forEach(line => {
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

    console.log('Checking profiles for demo users...');
    const { data: users, error: userError } = await supabase.from('users').select('id, email, role');
    if (userError) {
        console.error('Error fetching users:', userError);
        return;
    }

    console.log(`Found ${users.length} users in public.users table.`);

    const { data: profiles, error: profileError } = await supabase.from('profiles').select('id, email, role');
    if (profileError) {
        console.error('Error fetching profiles:', profileError);
        return;
    }

    console.log(`Found ${profiles.length} profiles in public.profiles table.`);

    const usersWithoutProfiles = users.filter(u => !profiles.find(p => p.id === u.id));
    console.log(`Users without profiles: ${usersWithoutProfiles.length}`);
    usersWithoutProfiles.forEach(u => console.log(`- ${u.email} (${u.role}) ID: ${u.id}`));
    
    // Check for specific demo teacher
    const demoTeacher = users.find(u => u.email === 'demo_teacher@school.com');
    if (demoTeacher) {
        const profile = profiles.find(p => p.id === demoTeacher.id);
        console.log(`Demo Teacher (demo_teacher@school.com): ${profile ? 'HAS profile' : 'MISSING profile'}`);
    }
}

debugProfiles();