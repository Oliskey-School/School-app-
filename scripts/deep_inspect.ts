
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

// Use Service Key to bypass RLS
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

const tables = [
    'profiles',
    'schools',
    'subjects',
    'class_sections',
    'academic_years',
    'students',
    'parents',
    'users', // Supabase auth.users is not accessible via client usually, but good to check if there's a public wrapper
    'student_achievements'
];

async function inspect() {
    console.log('--- Database Inspection ---');
    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.log(`[${table}] Error or does not exist:`, error.message);
        } else {
            const keys = data && data.length > 0 ? Object.keys(data[0]) : 'Empty table';
            console.log(`[${table}] Exists. Keys:`, keys);
        }
    }
    console.log('--- End Inspection ---');
}
inspect();
