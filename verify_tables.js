const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function verifyTables() {
    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';
    try {
        envContent = fs.readFileSync(envPath, 'utf8');
    } catch (e) {
        console.error('.env file not found');
        process.exit(1);
    }

    const envVars = {};
    const lines = envContent.split('\n');
    for (const line of lines) {
        const parts = line.split('=');
        if (parts.length >= 2) {
            envVars[parts[0].trim()] = parts.slice(1).join('=').trim();
        }
    }

    const supabaseUrl = envVars['VITE_SUPABASE_URL'];
    const supabaseKey = envVars['SUPABASE_SERVICE_ROLE_KEY'] || envVars['VITE_SUPABASE_ANON_KEY'];

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Checking quizzes table structure (via sample row)...');
    const { data: quiz, error: quizError } = await supabase.from('quizzes').select('*').limit(1);
    if (quizError) {
        console.error('Error fetching quiz:', quizError);
    } else if (quiz && quiz.length > 0) {
        console.log('Quiz columns:', Object.keys(quiz[0]));
        console.log('Sample quiz:', quiz[0]);
    } else {
        console.log('Quizzes table is empty.');
    }

    console.log('\nChecking for potential teacher ID mismatch...');
    
    // Check demo teacher explicitly
    const { data: demoTeacher, error: teacherError } = await supabase.from('users').select('*').eq('email', 'demo_teacher@school.com').single();
    if (demoTeacher) {
        console.log('Demo Teacher User ID:', demoTeacher.id);
        const { data: demoProfile } = await supabase.from('profiles').select('*').eq('id', demoTeacher.id).maybeSingle();
        console.log('Demo Teacher Profile:', demoProfile ? 'Exists' : 'MISSING');
        
        const { data: teacherRecord } = await supabase.from('teachers').select('*').eq('email', 'demo_teacher@school.com').maybeSingle();
        console.log('Demo Teacher Record (teachers table):', teacherRecord ? `Exists (id: ${teacherRecord.id})` : 'MISSING');
    }
}

verifyTables();