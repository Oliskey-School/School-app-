
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Try generic dotenv
try {
    require('dotenv').config();
} catch (e) {
    const envPath = path.resolve(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const parts = line.split('=');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                const value = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
                process.env[key] = value;
            }
        });
    }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error('Missing Supabase URL or Service Key.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function debugMissingParent() {
    console.log('--- Debugging Missing Parent Visibility ---');

    const PARENT_ID_STR = 'OLISKEY_MAIN_PAR_0001';
    const ADMIN_ID_STR = 'OLISKEY_MAIN_ADM_0001';

    // 1. Fetch Parent Details
    const { data: parent, error: pError } = await supabase
        .from('parents')
        .select('*')
        .eq('school_generated_id', PARENT_ID_STR)
        .single();

    if (pError) {
        console.error(`Error fetching parent ${PARENT_ID_STR}:`, pError.message);
    } else {
        console.log(`\nParent Found: ${parent.name}`);
        console.log(` - ID: ${parent.id}`);
        console.log(` - School Generated ID: ${parent.school_generated_id}`);
        console.log(` - School ID: ${parent.school_id}`);
        console.log(` - Branch ID: ${parent.branch_id}`);
        console.log(` - Status: ${parent.status || 'N/A'}`); // Check if there's a status field filtering them out
    }

    // 2. Fetch Admin Details (to compare Context)
    // Admin might be in 'school_users' or 'staff' depending on schema, usually 'school_users' for roles or 'proprietors'? 
    // Actually typically we check the User or Profile context.

    // Let's assume the admin is viewing the list, so we need to know WHICH school the admin belongs to.
    // We can infer this if the user is authenticated, but here in script we assume the admin meant "My School".
    // I'll try to find any user with that ID string if exists, or just check the SCHOOL itself.

    // Check if there is a 'teachers' or 'staff' record for this admin? 
    // Or just check the first school in the DB to see if IDs match.

    if (parent) {
        // Check if the school exists
        const { data: school } = await supabase
            .from('schools')
            .select('*')
            .eq('id', parent.school_id)
            .single();

        console.log(`\nParent's School: ${school ? school.name : 'NOT FOUND'}`);
    }

    // 3. fetchParents logic check
    // The admin list fetches `where school_id = X`.
    // Let's list ALL parents for this school to see if it appears.

    if (parent && parent.school_id) {
        const { count, error: cError } = await supabase
            .from('parents')
            .select('*', { count: 'exact', head: true })
            .eq('school_id', parent.school_id);

        console.log(`\nTotal Parents in this school: ${count}`);

        const { data: searchCheck } = await supabase
            .from('parents')
            .select('id, name, school_generated_id')
            .eq('school_id', parent.school_id)
            .eq('school_generated_id', PARENT_ID_STR);

        console.log(`\nCan I find this parent using school_id filter? ${searchCheck && searchCheck.length > 0 ? 'YES' : 'NO'}`);
    }
}

debugMissingParent();
