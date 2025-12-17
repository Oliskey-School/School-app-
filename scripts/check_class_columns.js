
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkColumns() {
    console.log("Fetching schema information for 'classes' table...");
    const { data, error } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, column_default, is_nullable')
        .eq('table_name', 'classes')
        .order('ordinal_position', { ascending: true });

    if (error) {
        console.error("Error fetching column information:", error.message);
    } else if (data) {
        console.log("Columns for 'classes' table:");
        if (data.length === 0) {
            console.log("No columns found for 'classes' table. Table might not exist or is inaccessible.");
        } else {
            data.forEach(column => {
                console.log(`  - Name: ${column.column_name}, Type: ${column.data_type}, Default: ${column.column_default}, Nullable: ${column.is_nullable}`);
            });
        }
    }
}

checkColumns();
