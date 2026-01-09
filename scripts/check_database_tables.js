// Check which tables exist in Supabase database
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
    console.log('🔍 Checking your Supabase database...\n');

    // Check if basic tables from old migrations exist
    const oldMigrationTables = [
        'profiles', 'classes', 'subjects', 'teachers', 'students', 'parents',
        'fees', 'attendance', 'timetable', 'quiz_results', 'cbt_exams'
    ];

    // Check if new module tables exist  
    const newModuleTables = [
        'teacher_salaries', 'payslips', 'arrears', 'health_logs',
        'parent_children', 'student_fees', 'appointments'
    ];

    console.log('📊 Checking OLD migration tables (0001-0042):\n');

    for (const table of oldMigrationTables) {
        const { data, error } = await supabase.from(table).select('id').limit(1);
        if (error) {
            console.log(`   ❌ ${table.padEnd(20)} - NOT FOUND`);
        } else {
            console.log(`   ✅ ${table.padEnd(20)} - EXISTS`);
        }
    }

    console.log('\n📊 Checking NEW module tables (0043-0055):\n');

    for (const table of newModuleTables) {
        const { data, error } = await supabase.from(table).select('id').limit(1);
        if (error) {
            console.log(`   ❌ ${table.padEnd(20)} - NOT FOUND`);
        } else {
            console.log(`   ✅ ${table.padEnd(20)} - EXISTS`);
        }
    }

    console.log('\n🎯 Recommendation:');
    console.log('   If most OLD tables exist → Only run CONSOLIDATED_06, 07, 08');
    console.log('   If most NEW tables exist → All migrations already applied!');
    console.log('   If nothing exists → Start from CONSOLIDATED_01 or run 0001-0042 first');
}

checkDatabase().catch(console.error);
