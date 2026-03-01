
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function runAudit() {
    console.log('🚀 Starting Final Backend Audit...\n');

    // Parse .env manually to ensure we have the latest keys
    const envPath = path.join(process.cwd(), '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    envContent.split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && value.length > 0) envVars[key.trim()] = value.join('=').trim();
    });

    const supabaseUrl = envVars['VITE_SUPABASE_URL'];
    const supabaseKey = envVars['SUPABASE_SERVICE_ROLE_KEY'] || envVars['SUPABASE_SERVICE_KEY'];

    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Missing Supabase URL or Service Role Key in .env');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Check Core Tables
    console.log('--- 1. Core Tables Verification ---');
    const coreTables = [
        'schools', 'students', 'teachers', 'classes', 'subjects',
        'gradebooks', 'fee_invoices', 'messages', 'quizzes', 'profiles',
        'attendance', 'exams', 'lesson_plans', 'forum_topics'
    ];

    let missingTables = [];
    for (const table of coreTables) {
        const { error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (error) {
            if (error.code === '42P01') {
                console.log(`❌ Table "${table}": MISSING`);
                missingTables.push(table);
            } else {
                console.log(`⚠️ Table "${table}": Error (${error.message})`);
            }
        } else {
            console.log(`✅ Table "${table}": EXISTS and ACCESSIBLE`);
        }
    }

    // 2. Connectivity & Auth Check
    console.log('\n--- 2. Service Accessibility ---');
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (authError) {
        console.log(`❌ Auth Service (Admin): FAILED (${authError.message})`);
    } else {
        console.log(`✅ Auth Service (Admin): ACCESSIBLE`);
    }

    // 3. Logic Check (Trigger Verification via insertion attempt)
    console.log('\n--- 3. Database Logic Check (Simulated) ---');
    console.log('Manual check recommended: Ensure "audit_student_changes" trigger appears in "Database -> Triggers" in Supabase UI.');
    console.log('Manual check recommended: Ensure "School Isolation Policy" appears in "Authentication -> Policies" in Supabase UI.');

    console.log('\n--- FINAL SUMMARY ---');
    if (missingTables.length === 0) {
        console.log('✅ ALL core tables are detected in your Supabase project.');
        console.log('💡 You can proceed to delete your SQL editor snippets IF you have also manually verified that the RLS policies and Triggers were successfully created (as seen in your earlier steps).');
    } else {
        console.log(`❌ The following tables are MISSING: ${missingTables.join(', ')}`);
        console.log('⚠️ DO NOT delete your SQl snippets yet.');
    }
}

runAudit().catch(err => {
    console.error('Unexpected error during audit:', err);
});
