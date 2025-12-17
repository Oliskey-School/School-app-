
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars from parent directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Supabase credentials missing in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
    // We can't easily list tables with supabase-js unless we have a stored procedure or use the pg_catalog via rpc if exposed.
    // However, often avoiding rpc complexities, we can try to simply select from likely tables to see if they error.

    const tablesToCheck = ['subjects', 'classes', 'academic_classes', 'school_subjects', 'grade_levels'];

    console.log("Checking for existence of potential reference tables...");

    for (const table of tablesToCheck) {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (error) {
            console.log(`Table '${table}': NOT FOUND or Error (${error.code})`);
        } else {
            console.log(`Table '${table}': EXISTS (Rows: ${count})`);
        }
    }
}

listTables();
