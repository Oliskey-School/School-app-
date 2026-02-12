const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function checkFK() {
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

    console.log('Testing inserts into quizzes with different teacher IDs...');
    
    const testSchoolId = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1'; // Oliskey Demo School
    
    // 1. Try with Auth User ID
    const authUserId = 'd3300000-0000-0000-0000-000000000002'; // demo_teacher@school.com
    console.log(`Trying with Auth User ID: ${authUserId}`);
    const { error: error1 } = await supabase.from('quizzes').insert({
        title: 'Test FK Auth',
        school_id: testSchoolId,
        teacher_id: authUserId,
        subject: 'Test'
    });
    if (error1) console.log('Result 1 (Auth ID):', error1.message);
    else console.log('Result 1 (Auth ID): SUCCESS');

    // 2. Try with Teachers Table ID
    const teacherTableId = '43fed44d-94d7-49b4-b5f7-ab7aad3e3704'; // from verify_tables.js output
    console.log(`Trying with Teachers Table ID: ${teacherTableId}`);
    const { error: error2 } = await supabase.from('quizzes').insert({
        title: 'Test FK Teachers',
        school_id: testSchoolId,
        teacher_id: teacherTableId,
        subject: 'Test'
    });
    if (error2) console.log('Result 2 (Teachers Table ID):', error2.message);
    else console.log('Result 2 (Teachers Table ID): SUCCESS');
}

checkFK();