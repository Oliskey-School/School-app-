
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
    console.log('🚀 Applying Timetable Migration...');

    const migrationPath = path.join(process.cwd(), 'database/migrations/0025_create_timetable_schema.sql');
    if (!fs.existsSync(migrationPath)) {
        console.error('❌ Migration file not found:', migrationPath);
        process.exit(1);
    }

    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Split statements
    const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements.`);

    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        console.log(`Executing statement ${i + 1}...`);

        const { error } = await supabase.rpc('exec_sql', { sql: stmt });

        if (error) {
            console.error(`❌ Error executing statement ${i + 1}:`, error.message);
            // Try continuing? Or fail?
            // If exec_sql RPC is missing, we will fail all.
            if (error.message.includes('function "exec_sql" does not exist') || error.code === 'PGRST202') {
                console.error("⛔ The RPC 'exec_sql' does not exist. Cannot apply migration automatically.");
                process.exit(1);
            }
        }
    }

    console.log('✅ Migration applied successfully (or best effort).');
}

applyMigration().catch(console.error);
