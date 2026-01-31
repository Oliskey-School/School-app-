
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key in .env');
    process.exit(1);
}

console.log('Connecting to:', supabaseUrl);
// console.log('Using Key:', supabaseKey ? '***' : 'Missing');

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCounts() {
    console.log('\n--- Checking Table Counts ---');

    // Students
    const { count: students, error: sErr, data: sData } = await supabase.from('students').select('school_id', { count: 'exact', head: false });
    if (sErr) console.error('Error fetching students:', sErr.message);
    else {
        console.log(`Total Students in DB: ${students}`);
        // Group by school_id if possible (client side aggregation for debug)
        const schoolCounts: Record<string, number> = {};
        sData?.forEach((r: any) => {
            const sid = r.school_id || 'null';
            schoolCounts[sid] = (schoolCounts[sid] || 0) + 1;
        });
        console.log('Students per School:', schoolCounts);
    }

    // Teachers
    const { count: teachers, error: tErr } = await supabase.from('teachers').select('*', { count: 'exact', head: true });
    if (tErr) console.error('Error fetching teachers:', tErr.message);
    else console.log(`Total Teachers in DB: ${teachers}`);

    // Parents
    const { count: parents, error: pErr } = await supabase.from('parents').select('*', { count: 'exact', head: true });
    if (pErr) console.error('Error fetching parents:', pErr.message);
    else console.log(`Total Parents in DB: ${parents}`);

    console.log('\n-----------------------------');
}

checkCounts();
