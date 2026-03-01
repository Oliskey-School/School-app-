const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function verifyEnrollments() {
    console.log('🧪 Starting Multi-Class Enrollment Verification...\n');

    const envPath = path.join(process.cwd(), '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    envContent.split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && value.length > 0) envVars[key.trim()] = value.join('=').trim();
    });

    const supabase = createClient(envVars['VITE_SUPABASE_URL'], envVars['SUPABASE_SERVICE_ROLE_KEY'] || envVars['SUPABASE_SERVICE_KEY']);

    // 1. Check if enrollment records exist
    const { data: enrollments, error: enrollmentError } = await supabase
        .from('student_enrollments')
        .select('id, student_id, class_id, is_primary')
        .limit(10);

    if (enrollmentError) {
        console.error('❌ Error fetching enrollments:', enrollmentError.message);
    } else if (enrollments.length === 0) {
        console.log('⚠️ No enrollment records found (Migration might have found no students with class_id).');
    } else {
        console.log(`✅ Found ${enrollments.length} enrollment records.`);
        console.log('Sample enrollment:', enrollments[0]);
    }

    // 2. Verify junction integrity (random student)
    if (enrollments.length > 0) {
        const testStudentId = enrollments[0].student_id;
        const { data: studentWithClasses, error: joinError } = await supabase
            .from('student_enrollments')
            .select('classes(name, grade, section)')
            .eq('student_id', testStudentId);

        if (joinError) {
            console.error('❌ Error verifying junction join:', joinError.message);
        } else {
            console.log(`✅ Successfully fetched ${studentWithClasses.length} class(es) for student ${testStudentId}.`);
            studentWithClasses.forEach((e, i) => console.log(`   Class ${i+1}: ${e.classes.name}`));
        }
    }

    console.log('\n--- VERIFICATION COMPLETE ---');
}

verifyEnrollments().catch(err => console.error(err));
