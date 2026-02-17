const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const schoolId = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';

const serviceClient = createClient(supabaseUrl, supabaseKey);
const anonClient = createClient(supabaseUrl, anonKey);

async function checkRLSAndData() {
    console.log('🔍 Checking RLS Status and Data Access...\n');

    // 1. Check RLS status
    const { data: rlsStatus, error: rlsError } = await serviceClient
        .from('pg_tables')
        .select('tablename, rowsecurity')
        .in('tablename', ['teachers', 'parents', 'students'])
        .eq('schemaname', 'public');

    console.log('📋 RLS Status:');
    console.log(rlsStatus || rlsError);

    // 2. Check data with SERVICE_ROLE key
    console.log('\n📊 Data Counts (SERVICE_ROLE):');
    const { count: teacherCount } = await serviceClient
        .from('teachers')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', schoolId);
    console.log(`Teachers: ${teacherCount}`);

    const { count: parentCount } = await serviceClient
        .from('parents')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', schoolId);
    console.log(`Parents: ${parentCount}`);

    // 3. Check data with ANON key (what frontend uses)
    console.log('\n🌐 Data Counts (ANON - Frontend perspective):');
    const { count: anonTeacherCount, error: anonTeacherError } = await anonClient
        .from('teachers')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', schoolId);
    console.log(`Teachers: ${anonTeacherCount || 'ERROR: ' + anonTeacherError?.message}`);

    const { count: anonParentCount, error: anonParentError } = await anonClient
        .from('parents')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', schoolId);
    console.log(`Parents: ${anonParentCount || 'ERROR: ' + anonParentError?.message}`);

    // 4. Sample teacher data
    const { data: sampleTeachers } = await serviceClient
        .from('teachers')
        .select('id, name, school_id, branch_id')
        .eq('school_id', schoolId)
        .limit(3);
    console.log('\n👥 Sample Teachers:');
    console.log(JSON.stringify(sampleTeachers, null, 2));
}

checkRLSAndData().catch(console.error);
