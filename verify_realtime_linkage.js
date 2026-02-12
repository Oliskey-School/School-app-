const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
// Using service role to bypass RLS for debugging
const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey);

const SCHOOL_ID = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';

async function debugLinkage() {
    console.log('--- Debugging Branch Linkage ---');

    try {
        // 1. Check Branches
        const { data: branches, error: bErr } = await supabase
            .from('branches')
            .select('*')
            .eq('school_id', SCHOOL_ID);
        
        console.log(`Found ${branches?.length || 0} branches for school.`);
        if (branches) {
            branches.forEach(b => console.log(`   - Branch: ${b.name} (${b.id}) [Main: ${b.is_main}]`));
        }

        // 2. Check Students
        const { data: students, error: sErr } = await supabase
            .from('students')
            .select('id, name, school_id, branch_id')
            .eq('school_id', SCHOOL_ID)
            .limit(5);

        console.log(`\nSample Students (Total found in DB: ${students?.length || 0}):`);
        if (students) {
            students.forEach(s => {
                const branchMatch = branches?.find(b => b.id === s.branch_id);
                console.log(`   - ${s.name}: branch_id=${s.branch_id} [Exists in branches: ${!!branchMatch}]`);
            });
        }

        // 3. Check for Orphaned Students (NULL branch_id)
        const { count: orphanedCount } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('school_id', SCHOOL_ID)
            .is('branch_id', null);
        
        console.log(`\nOrphaned Students (branch_id IS NULL): ${orphanedCount}`);

        // 4. Check User/Profile for the demo admin
        const { data: adminProfile } = await supabase
            .from('profiles')
            .select('id, name, school_id, branch_id')
            .eq('email', 'demo_admin@school.com')
            .maybeSingle();
        
        if (adminProfile) {
            console.log(`\nAdmin Profile:`);
            console.log(`   - Name: ${adminProfile.name}`);
            console.log(`   - School: ${adminProfile.school_id}`);
            console.log(`   - Branch: ${adminProfile.branch_id}`);
        }

    } catch (err) {
        console.error('Debug failed:', err);
    }
}

debugLinkage();
