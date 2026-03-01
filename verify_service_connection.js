
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing Supabase URL or Service Role Key in .env');
  process.exit(1);
}

console.log(`Checking connection to ${supabaseUrl} using service_role key...`);

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function testConnection() {
  try {
    // List tables across all schemas (if possible) or just a simple query
    const { data: tables, error } = await supabase
      .from('schools') // Try to fetch from a known table
      .select('count', { count: 'exact', head: true });

    if (error) {
      console.error('❌ Connection failed or table "schools" not accessible:', error.message);
      
      // Try a different table
      const { data: students, error: studentError } = await supabase
        .from('students')
        .select('count', { count: 'exact', head: true });
      
      if (studentError) {
        console.error('❌ Table "students" also not accessible:', studentError.message);
      } else {
        console.log('✅ Connection successful via "students" table!');
      }
    } else {
      console.log('✅ Connection successful! Found schools.');
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
  }
}

testConnection();
