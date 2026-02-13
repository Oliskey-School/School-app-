
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !supabaseKey) process.exit(1);

const supabase = createClient(supabaseUrl, supabaseKey);

async function findBisiola() {
    const tables = ['profiles', 'teachers', 'staff', 'users', 'students'];
    for (const table of tables) {
        console.log(`Checking table: ${table}`);
        const { data, error } = await supabase
            .from(table)
            .select('*')
            .or('full_name.ilike.%Bisiola%,first_name.ilike.%Bisiola%,id.ilike.%Bisiola%')
            .limit(5);

        if (data && data.length > 0) {
            console.log(`Match found in ${table}:`, data);
        }
        if (error) console.log(`Error in ${table}:`, error.message);
    }
}

findBisiola();
