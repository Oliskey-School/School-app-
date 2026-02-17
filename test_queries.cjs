const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const schoolId = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';

const anonClient = createClient(supabaseUrl, anonKey);

async function testQueries() {
    console.log('🧪 Testing different query patterns...\n');

    // Test 1: Query with only schoolId (no branch filter)
    console.log('1️⃣ Query: school_id ONLY');
    const { data: d1, error: e1 } = await anonClient
        .from('teachers')
        .select('id, name, school_id, branch_id')
        .eq('school_id', schoolId);
    console.log(`   Result: ${d1?.length || 0} teachers, Error: ${e1?.message || 'none'}`);

    // Test 2: Query with schoolId and branchId
    console.log('\n2️⃣ Query: school_id + branch_id');
    const { data: d2, error: e2 } = await anonClient
        .from('teachers')
        .select('id, name, school_id, branch_id')
        .eq('school_id', schoolId)
        .eq('branch_id', '7601cbea-e1ba-49d6-b59b-412a584cb94f');
    console.log(`   Result: ${d2?.length || 0} teachers, Error: ${e2?.message || 'none'}`);

    // Test 3: Query with schoolId and branchId = null
    console.log('\n3️⃣ Query: school_id + branch_id IS NULL');
    const { data: d3, error: e3 } = await anonClient
        .from('teachers')
        .select('id, name, school_id, branch_id')
        .eq('school_id', schoolId)
        .is('branch_id', null);
    console.log(`   Result: ${d3?.length || 0} teachers, Error: ${e3?.message || 'none'}`);

    // Test 4: Same tests for parents
    console.log('\n4️⃣ Parents - school_id ONLY');
    const { data: d4, error: e4 } = await anonClient
        .from('parents')
        .select('id, name')
        .eq('school_id', schoolId);
    console.log(`   Result: ${d4?.length || 0} parents, Error: ${e4?.message || 'none'}`);

    // Test 5: Check if teacher_subjects join causes issues
    console.log('\n5️⃣ Query with teacher_subjects join:');
    const { data: d5, error: e5 } = await anonClient
        .from('teachers')
        .select(`
            *,
            teacher_subjects(subject),
            teacher_classes(class_name)
        `)
        .eq('school_id', schoolId);
    console.log(`   Result: ${d5?.length || 0} teachers, Error: ${e5?.message || 'none'}`);
}

testQueries().catch(console.error);
