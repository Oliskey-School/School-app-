
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

async function checkRLS() {
    console.log('Checking schools table RLS...');
    // We can check pg_class or similar, or just try to select as anon

    // Using introspection to check RLS flag
    const { data, error } = await supabase.rpc('get_table_info', { table_name: 'schools' });
    // Wait, get_table_info might not exist.

    // Simpler: Query pg_tables via SQL if possible, or just `list_tables` via MCP was better but failed.
    // I will try to read internal PostgREST info if exposed? No.

    // Let's just try to read as a "fake" user with a school_id claim matching the demo school
    // But I don't have a way to sign a token easily here without `jsonwebtoken` lib or using `signIn`.

    // I will just assume I need to ADD the policy to be safe. 
    // Safer to just create a migration "0108_schools_rls.sql" that ensures it.

    // But let's check if the table exists at least
    const { data: schools, error: err } = await supabase.from('schools').select('*').limit(1);
    if (err) console.log('Error reading schools (Service Role):', err.message);
    else console.log('Schools table readable by Service Role. Count:', schools.length);
}

checkRLS();
