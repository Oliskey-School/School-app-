
const { createClient } = require('@supabase/supabase-client');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log('--- Checking Classes ---');
    const { data: classes, error: classesError } = await supabase.from('classes').select('*').limit(5);
    if (classesError) console.error('Classes Error:', classesError);
    else console.log('Classes count:', classes?.length, 'Sample:', classes?.[0]);

    console.log('\n--- Checking Subjects ---');
    const { data: subjects, error: subjectsError } = await supabase.from('subjects').select('*').limit(5);
    if (subjectsError) console.error('Subjects Error:', subjectsError);
    else console.log('Subjects count:', subjects?.length, 'Sample:', subjects?.[0]);

    console.log('\n--- Checking Teachers ---');
    const { data: teachers, error: teachersError } = await supabase.from('teachers').select('*').limit(5);
    if (teachersError) console.error('Teachers Error:', teachersError);
    else console.log('Teachers count:', teachers?.length, 'Sample:', teachers?.[0]);
}

checkData();
