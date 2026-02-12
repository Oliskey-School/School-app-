
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

try { require('dotenv').config(); } catch (e) { }

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function verifyStudentMapping() {
    console.log('--- Verifying Student ID Mapping ---');

    // Fetch a few students
    const { data: students, error } = await supabase
        .from('students')
        .select('id, school_id, school_generated_id, name')
        .limit(3);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Fetched ${students.length} students.`);

    // Simulate mapping
    const mapped = students.map(s => ({
        id: s.id,
        schoolId: s.school_id,
        schoolGeneratedId: s.school_generated_id,
        name: s.name
    }));

    console.table(mapped);

    const hasIssues = mapped.some(s => !s.schoolGeneratedId);
    if (hasIssues) {
        console.log('⚠️ Some students are missing schoolGeneratedId (might be old records or demo data issues).');
    } else {
        console.log('✅ All fetched students have schoolGeneratedId mapped.');
    }
}

verifyStudentMapping();
