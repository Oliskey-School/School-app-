
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const commonNames = ['id', 'student_user_id', 'class_id', 'school_id', 'branch_id', 'is_primary', 'status', 'created_at'];

async function probe() {
  console.log('--- Probing student_enrollments for all expected columns ---');
  const results = [];
  for (const name of commonNames) {
    const { error } = await supabase
      .from('student_enrollments')
      .select(name)
      .limit(1);

    if (!error) {
      results.push(`${name}: ✅`);
    } else {
      results.push(`${name}: ❌ (${error.message})`);
    }
  }
  console.log(results.join('\n'));
}

probe();
