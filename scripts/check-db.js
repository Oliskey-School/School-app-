
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCounts() {
    console.log('Checking Supabase Database:', supabaseUrl);

    const { count: students, error: sErr } = await supabase.from('students').select('*', { count: 'exact', head: true });
    if (sErr) console.error('Students Error:', sErr.message);
    else console.log('Students in DB:', students);

    const { count: teachers, error: tErr } = await supabase.from('teachers').select('*', { count: 'exact', head: true });
    if (tErr) console.error('Teachers Error:', tErr.message);
    else console.log('Teachers in DB:', teachers);

    const { count: parents, error: pErr } = await supabase.from('parents').select('*', { count: 'exact', head: true });
    if (pErr) console.error('Parents Error:', pErr.message);
    else console.log('Parents in DB:', parents);
}

checkCounts();
