
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

async function debugStudentClasses() {
    console.log('--- Debugging Student Classes (v2) ---');

    const SCHOOL_ID = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';
    const { data: students, error } = await supabase
        .from('students')
        .select('id, first_name, current_class_id, status')
        .eq('school_id', SCHOOL_ID)
        .eq('status', 'Active')
        .limit(50);

    if (error) { console.error(error); return; }

    // 1. Identify what classes the students ARE in
    const activeClassIds = [...new Set(students.map(s => s.current_class_id).filter(Boolean))];
    console.log(`\nActive Class IDs found in ${students.length} students:`, activeClassIds);

    if (activeClassIds.length > 0) {
        const { data: activeClasses } = await supabase
            .from('classes')
            .select('id, name, grade, section')
            .in('id', activeClassIds);

        console.log('\nActive Classes Details (Where students actually are):');
        console.table(activeClasses);
    }

    // 2. Check for duplicate "Primary 4" classes
    console.log('\nChecking for all "Primary 4" classes in this school...');
    const { data: p4Classes } = await supabase
        .from('classes')
        .select('id, name, grade, section')
        .eq('school_id', SCHOOL_ID)
        .ilike('name', '%Primary 4%');

    console.log('\nAll "Primary 4" Classes:');
    console.table(p4Classes);

    // 3. Check for specific problematic ID
    const PROBLEM_ID = '954d524e-ffb9-49b5-8462-f7a02d4084d1';
    console.log(`\nIs the Problem ID (${PROBLEM_ID}) in the Active List? ${activeClassIds.includes(PROBLEM_ID)}`);
}

debugStudentClasses();
