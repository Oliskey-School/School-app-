const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function check() {
    console.log("Checking for 'Demo Parent'...");

    // 1. Check Profiles
    const { data: profile } = await supabase.from('profiles').select('*').ilike('full_name', '%Demo Parent%').maybeSingle();
    console.log("Profile:", profile ? `Found (${profile.id})` : "Not Found");

    // 2. Check Parents
    const { data: parent } = await supabase.from('parents').select('*').ilike('name', '%Demo Parent%').maybeSingle();
    console.log("Parent Table:", parent ? `Found (${parent.id})` : "Not Found");

    // 3. Check Alat
    console.log("\nChecking for 'Alat'...");
    const { data: profileAlat } = await supabase.from('profiles').select('*').ilike('full_name', '%Alat%').maybeSingle();
    console.log("Profile:", profileAlat ? `Found (${profileAlat.id})` : "Not Found");

    const { data: parentAlat } = await supabase.from('parents').select('*').ilike('name', '%Alat%').maybeSingle();
    console.log("Parent Table:", parentAlat ? `Found (${parentAlat.id})` : "Not Found");
}

check();
