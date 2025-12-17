
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugStudentParent() {
    console.log('--- DEBUG START ---');

    // 1. Find Student 'olamide'
    const { data: students, error: sErr } = await supabase
        .from('students')
        .select('id, name')
        .ilike('name', '%olamide%');

    if (sErr) console.error('Student Search Error:', sErr);
    console.log('Students Found:', students);

    if (!students || students.length === 0) return;
    const studentId = students[0].id;

    // 2. Find Links for this student
    const { data: links, error: lErr } = await supabase
        .from('parent_children')
        .select('*')
        .eq('student_id', studentId);

    if (lErr) console.error('Links Search Error:', lErr);
    console.log('Parent-Child Links:', links);

    if (links && links.length > 0) {
        const parentId = links[0].parent_id;
        // 3. Find Parent
        const { data: parent, error: pErr } = await supabase
            .from('parents')
            .select('*')
            .eq('id', parentId);

        console.log('Parent Details:', parent);
    } else {
        console.log('No parent linked to this student.');
    }
}

debugStudentParent();
