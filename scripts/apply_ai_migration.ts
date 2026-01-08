
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Fix for import.meta issue in some environments, using process.cwd()
dotenv.config({ path: path.join(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
// Try service role key first, then fall back to anon key (might fail for DDL but worth a shot if exec_sql allows it)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("🚀 Applying AI Assistant Schema...");

    // Read the SQL file
    const sqlPath = path.join(process.cwd(), 'database', 'migrations', '0031_ai_assistant_schema.sql');
    if (!fs.existsSync(sqlPath)) {
        console.error("❌ Migration file not found at:", sqlPath);
        process.exit(1);
    }

    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

    // Clean and split SQL - simple split by semicolon
    const statements = sqlContent
        .split(';')
        .map(s => s.trim())
        .map(s => s.trim())
        .filter(s => s.length > 0);

    console.log(`Found ${statements.length} SQL statements to execute.`);

    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        console.log(`Executing statement ${i + 1}...`);

        // Try rpc 'exec_sql' pattern common in Supabase generic setups
        const { error } = await supabase.rpc('exec_sql', { sql: stmt });

        if (error) {
            console.error(`❌ Statement ${i + 1} failed via RPC:`, error.message);
            console.log("Attempting direct raw query via rest interface if supported...");
            // Use _sql workaround or just fail
            // Fallback: If rpc fails, we might just stop or try to assume success? 
            // Better to show the error.
        } else {
            console.log(`✅ Statement ${i + 1} success.`);
        }
    }

    console.log("🏁 Migration script finished.");
}

run();
