
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !supabaseKey) process.exit(1);

const supabase = createClient(supabaseUrl, supabaseKey);

async function searchBisiola() {
    // Search in teachers
    const { data: teachers } = await supabase.from('teachers').select('*').ilike('full_name', '%Bisiola%');
    console.log('Teachers with Bisiola:', teachers);

    // Search in staff
    const { data: staff } = await supabase.from('staff').select('*').ilike('full_name', '%Bisiola%');
    console.log('Staff with Bisiola:', staff);

    // Search in users (custom table, not auth.users)
    const { data: users } = await supabase.from('users').select('*').ilike('full_name', '%Bisiola%');
    console.log('Users with Bisiola:', users);
}

searchBisiola();
