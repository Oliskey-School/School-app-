
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkSchema() {
    console.log('🔍 Checking public.profiles schema...');

    try {
        // Attempt to select the specific column 'school_generated_id'
        // If it fails, we know it's missing.
        const { data, error } = await supabase
            .from('profiles')
            .select('school_generated_id')
            .limit(1);

        if (error) {
            console.error('❌ Schema Check Failed:', error.message);
            console.log('Detailed:', error);
            if (error.message.includes('does not exist') || error.code === '42703') {
                console.log('🚨 CONCLUSION: The column "school_generated_id" is MISSING.');
            }
        } else {
            console.log('✅ Column "school_generated_id" exists!');
        }

    } catch (err) {
        console.error('❌ Unexpected Error:', err);
    }
}

checkSchema();
