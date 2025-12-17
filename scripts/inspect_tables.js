
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function inspectTables() {
    console.log("--- Classes Sample ---");
    const { data: classes, error: cErr } = await supabase.from('classes').select('*').limit(2);
    if (cErr) console.log(cErr);
    console.log(JSON.stringify(classes, null, 2));

    console.log("--- Subjects Sample ---");
    const { data: subjects, error: sErr } = await supabase.from('subjects').select('*').limit(2);
    if (sErr) console.log(sErr);
    console.log(JSON.stringify(subjects, null, 2));
}

inspectTables();
