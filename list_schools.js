const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function listSchools() {
    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';
    try {
        envContent = fs.readFileSync(envPath, 'utf8');
    } catch (e) {
        console.error('.env file not found');
        process.exit(1);
    }

    const envVars = {};
    const lines = envContent.split(/\r?\n/);
    for (const line of lines) {
        const parts = line.split('=');
        if (parts.length >= 2) {
            envVars[parts[0].trim()] = parts.slice(1).join('=').trim();
        }
    }

    const supabaseUrl = envVars['VITE_SUPABASE_URL'];
    const supabaseKey = envVars['SUPABASE_SERVICE_ROLE_KEY'] || envVars['VITE_SUPABASE_ANON_KEY'];

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Listing schools...');
    const { data: schools, error } = await supabase.from('schools').select('id, name');
    if (error) {
        console.error('Error fetching schools:', error);
        return;
    }

    console.log(`Found ${schools.length} schools:`);
    schools.forEach(s => console.log(`- ${s.name} (ID: ${s.id})`));
}

listSchools();