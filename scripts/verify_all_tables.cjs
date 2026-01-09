const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env to avoid dependency issues
const envPath = path.join(__dirname, '..', '.env');
console.log('Reading .env from:', envPath);
let envContent = '';
try {
    envContent = fs.readFileSync(envPath, 'utf8');
} catch (e) {
    console.error('Error reading .env:', e.message);
    process.exit(1);
}

const envVars = {};
envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
        envVars[key.trim()] = valueParts.join('=').trim();
    }
});

const supabaseUrl = envVars['VITE_SUPABASE_URL'] || envVars['SUPABASE_URL'];
const supabaseKey = envVars['SUPABASE_SERVICE_ROLE_KEY'] || envVars['VITE_SUPABASE_KEY'] || envVars['VITE_SUPABASE_ANON_KEY']; // Prefer service role for admin checks

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing credentials. URL:', !!supabaseUrl, 'Key:', !!supabaseKey);
    process.exit(1);
}
console.log('Credentials loaded. URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

const TABLES_TO_CHECK = [
    // Core
    'users', 'students', 'teachers', 'parents', 'admin_users',

    // Academic
    'classes', 'subjects', 'academic_performance', 'attendance', 'student_attendance',
    'assignments', 'assignment_submissions', 'timetable', 'calendar_events',

    // Financial
    'fees', 'student_fees', 'payments', 'fee_payments',
    'teacher_salaries', 'payslips', 'arrears', 'salary_payments', 'vendors',

    // Communication & Resources
    'notices', 'resources', 'generated_resources', 'chats', 'messages',
    'notifications', 'parent_teacher_conferences',

    // Support & Safety
    'menstrual_support_requests', 'anonymous_reports', 'permission_slips',
    'volunteer_signups', 'mental_health_resources', 'crisis_helplines',
    'panic_activations', 'counseling_appointments', 'maintenance_tickets'
];

async function checkTables() {
    console.log('🔍 Checking for existence of ' + TABLES_TO_CHECK.length + ' tables...');
    const results = { exists: [], missing: [], errors: [] };

    for (const table of TABLES_TO_CHECK) {
        try {
            const { error } = await supabase.from(table).select('id').limit(1);
            if (error) {
                // Postgres error 42P01 is "undefined_table"
                if (error.code === '42P01' || error.message.includes('relation') || error.message.includes('does not exist')) {
                    results.missing.push(table);
                    process.stdout.write('❌');
                } else {
                    results.errors.push(`${table}: ${error.message}`);
                    process.stdout.write('⚠️');
                }
            } else {
                results.exists.push(table);
                process.stdout.write('✅');
            }
        } catch (err) {
            results.errors.push(`${table}: ${err.message}`);
            process.stdout.write('💥');
        }
    }

    console.log('\n\n--- SUMMARY ---');
    console.log(`✅ Existing: ${results.exists.length}`);
    console.log(`❌ Missing: ${results.missing.length}`);

    if (results.missing.length > 0) {
        console.log('\nMISSING TABLES (Run migration 0046 to fix):');
        results.missing.forEach(t => console.log(` - ${t}`));
    }

    if (results.errors.length > 0) {
        console.log('\nOTHER ERRORS:');
        results.errors.forEach(e => console.log(` - ${e}`));
    }
}

checkTables();
