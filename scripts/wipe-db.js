
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function wipeDatabase() {
    console.log('Wiping database...');

    // Delete in order to respect foreign keys (child -> parent)
    await supabase.from('parent_children').delete().neq('id', 0);
    await supabase.from('health_logs').delete().neq('id', 0);
    await supabase.from('student_fees').delete().neq('id', 0);
    await supabase.from('student_attendance').delete().neq('date', '1900-01-01'); // Hack to delete all
    await supabase.from('report_cards').delete().neq('status', 'Impossible');

    // Main entities
    await supabase.from('students').delete().neq('id', 0);
    await supabase.from('teachers').delete().neq('id', 0);
    await supabase.from('parents').delete().neq('id', 0);
    await supabase.from('auth_accounts').delete().neq('id', 0);
    await supabase.from('users').delete().neq('id', 0);

    console.log('Database cleared.');
}

wipeDatabase();
