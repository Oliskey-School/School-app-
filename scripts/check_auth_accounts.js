
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkAuthAccounts() {
    console.log("Checking auth_accounts table...");
    const { data, error } = await supabase.from('auth_accounts').select('*');

    if (error) {
        console.error("Error fetching auth_accounts:", error);
    } else {
        console.log(`Found ${data.length} records in auth_accounts.`);
        console.log(JSON.stringify(data, null, 2));
    }

    console.log("Checking users table...");
    const { data: uData, error: uError } = await supabase.from('users').select('*');
    if (uError) {
        console.log("Error fetching users:", uError);
    } else {
        console.log(`Found ${uData.length} records in users.`);
    }
}

checkAuthAccounts();
