const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load env
const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectParents() {
    console.log("Inspecting Parents Table...");

    // 1. Fetch all parents
    const { data: parents, error } = await supabase
        .from('parents')
        .select('*');

    if (error) {
        console.error("Error fetching parents:", error);
    } else {
        console.log(`Found ${parents.length} parents in 'parents' table:`);
        parents.forEach(p => console.log(` - [${p.id}] ${p.first_name || p.name} (School: ${p.school_id})`));
    }

    // 2. Fetch profiles/users that might be parents
    console.log("\nInspecting Profiles (role='parent')...");
    const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'parent');

    if (pError) {
        console.error("Error fetching profiles:", pError);
    } else {
        console.log(`Found ${profiles.length} 'parent' profiles:`);
        profiles.forEach(p => console.log(` - [${p.id}] ${p.full_name} (School: ${p.school_id})`));
    }

    // 3. Helper to find specific names
    console.log("\nSearching for 'Alat' or 'Demo'...");

    const { data: searchP, error: searchErr } = await supabase
        .from('profiles')
        .select('*')
        .or('full_name.ilike.%Alat%,full_name.ilike.%Demo%,email.ilike.%demo%');

    if (searchP) {
        searchP.forEach(p => console.log(` - Found in Profiles: ${p.full_name} (${p.role}) ID: ${p.id} School: ${p.school_id}`));
    }

}

inspectParents();
