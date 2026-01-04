import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Load .env manually
const envPath = path.resolve(projectRoot, '.env');
console.log('Reading .env from:', envPath);

let envConfig = '';
try {
    envConfig = fs.readFileSync(envPath, 'utf8');
} catch (e) {
    console.error("Could not read .env file:", e.message);
    process.exit(1);
}

const env = {};
envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
    console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env");
    process.exit(1);
}

console.log('Supabase URL:', url);
// console.log('Supabase Key:', key); // Don't log key

const supabase = createClient(url, key);

async function check() {
    console.log('--- Checking DB Counts ---');

    // Students
    const { count: sCount, error: sError } = await supabase.from('students').select('*', { count: 'exact', head: true });
    if (sError) console.error('Students Error:', sError.message);
    else console.log('Students Count:', sCount);

    // Teachers
    const { count: tCount, error: tError } = await supabase.from('teachers').select('*', { count: 'exact', head: true });
    if (tError) console.error('Teachers Error:', tError.message);
    else console.log('Teachers Count:', tCount);

    // Parents
    const { count: pCount, error: pError } = await supabase.from('parents').select('*', { count: 'exact', head: true });
    if (pError) console.error('Parents Error:', pError.message);
    else console.log('Parents Count:', pCount);

    // Users
    const { count: uCount, error: uError } = await supabase.from('users').select('*', { count: 'exact', head: true });
    if (uError) console.error('Users Error:', uError.message);
    else console.log('Users Count (public):', uCount);

    console.log('--- End Check ---');
}

check();
