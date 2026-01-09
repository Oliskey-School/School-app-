// Check what tables exist in your Supabase database
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
    console.log('🔍 Checking existing database tables...\n');

    const criticalTables = [
        'users', 'teachers', 'students', 'parents', 'classes', 'subjects',
        'teacher_salaries', 'payslips', 'arrears', 'parent_children',
        'student_fees', 'appointments', 'leave_requests', 'leave_balances'
    ];

    console.log('📊 TABLE STATUS:\n');

    for (const table of criticalTables) {
        const { data, error } = await supabase.from(table).select('id').limit(1);
        const status = error ? '❌ MISSING' : '✅ EXISTS';
        console.log(`${status}  ${table}`);
    }

    console.log('\n💡 TIP: Tables marked as MISSING need to be created');
}

checkTables().catch(console.error);
