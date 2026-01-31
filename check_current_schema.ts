
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('Checking tables...');

    // Check 'timetable' table
    const { data: timetable, error: err1 } = await supabase.from('timetable').select('*').limit(1);
    if (err1) console.log('Error accessing timetable:', err1.message);
    else console.log('Timetable table exists. Sample:', timetable);

    // Check 'teachers' table
    const { data: teachers, error: err2 } = await supabase.from('teachers').select('*').limit(1);
    if (err2) console.log('Error accessing teachers:', err2.message);
    else console.log('Teachers table exists. Sample:', teachers);

    // Check 'classes' table
    const { data: classes, error: err3 } = await supabase.from('classes').select('*').limit(1);
    if (err3) console.log('Error accessing classes:', err3.message);
    else console.log('Classes table exists. Sample:', classes);
}

checkSchema();
