
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing Supabase URL or Service Role Key in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkSchema() {
  console.log('--- Querying pg_attribute for columns ---');
  try {
    const sql = `
      SELECT attname as column_name
      FROM pg_attribute 
      WHERE attrelid = 'public.student_enrollments'::regclass 
      AND attnum > 0 
      AND NOT attisdropped;
    `;
    const { data, error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      console.error('❌ SQL Error:', error.message);
    } else {
      console.log('✅ Columns found:');
      if (Array.isArray(data)) {
        data.forEach(row => console.log(` - ${row.column_name}`));
      } else {
        console.log('Data:', data);
      }
    }
  } catch (err) {
    console.error('❌ Unexpected exception:', err.message);
  }
}

checkSchema();
