require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase URL or Anon Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const TABLES = [
  'schools',
  'profiles',
  'students',
  'teachers',
  'parents',
  'classes',
  'subjects',
  'notifications',
  'messages',
  'attendance',
  'assignments'
];

async function check() {
  console.log('Checking tables...');
  
  for (const table of TABLES) {
    try {
      // Trying to fetch 0 rows, just to check existence
      const { error } = await supabase.from(table).select('count', { count: 'exact', head: true });
      
      if (error) {
        if (error.code === '42P01') {
          console.error(`[MISSING] ${table}`);
        } else if (error.code === '42501') {
          console.log(`[RLS Protected] ${table}`);
        } else {
          console.log(`[Error ${error.code}] ${table}: ${error.message}`);
        }
      } else {
        console.log(`[OK] ${table}`);
      }
    } catch (e) {
      console.error(`[Exception] ${table}: ${e.message}`);
    }
  }
}

check();
