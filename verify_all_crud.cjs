const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const schoolId = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';

const tables = [
    'users', 'profiles', 'schools', 'teachers', 'students', 'parents',
    'classes', 'subjects', 'timetable', 'teacher_attendance',
    'student_attendance', 'assignments', 'assignment_submissions',
    'messages', 'conversations', 'gradebooks', 'assessments',
    'report_cards', 'notifications', 'notices',
    'teacher_subjects', 'teacher_classes', 'parent_children', 'student_parent_links'
];

async function runDiagnostics() {
    console.log('🚀 Starting System-Wide CRUD Diagnostics (Anon Key)\n');
    const errors = [];

    console.log('--------------------------------------------------');
    console.log('| Table                     | Read | Update | Insert |');
    console.log('--------------------------------------------------');

    for (const table of tables) {
        let readStatus = '❓';
        let updateStatus = '❓';
        let insertStatus = '❓';

        try {
            // 1. Test Read
            const { data: readData, error: readError } = await supabase.from(table).select('*').limit(1);
            if (readError) {
                readStatus = readError.message.includes('permission denied') ? '❌' : '⚠️';
                errors.push(`[${table} READ] ${readError.message} (${readError.code})`);
            } else {
                readStatus = '✅';
            }

            // 2. Test Update (on first record if exists)
            if (readData && readData.length > 0) {
                const record = readData[0];
                const id = record.id;
                const updatePayload = {};
                if ('status' in record) updatePayload.status = record.status;
                else if ('name' in record) updatePayload.name = record.name;
                else if ('title' in record) updatePayload.title = record.title;
                else if ('full_name' in record) updatePayload.full_name = record.full_name;

                if (Object.keys(updatePayload).length > 0 && id) {
                    const { error: updateError } = await supabase.from(table).update(updatePayload).eq('id', id);
                    if (updateError) {
                        updateStatus = updateError.message.includes('permission denied') ? '❌' : '⚠️';
                        errors.push(`[${table} UPDATE] ${updateError.message} (${updateError.code})`);
                    } else {
                        updateStatus = '✅';
                    }
                } else {
                    updateStatus = '➖';
                }
            } else {
                updateStatus = '🚫';
            }

            // 3. Test Insert
            const insertTables = ['notifications', 'teacher_attendance', 'notices'];
            if (insertTables.includes(table)) {
                let payload = { school_id: schoolId };
                if (table === 'notifications') {
                    payload.title = 'Test';
                    payload.message = 'Test';
                } else if (table === 'teacher_attendance') {
                    const { data: teacher } = await supabase.from('teachers').select('id').limit(1).maybeSingle();
                    if (teacher) {
                        payload.teacher_id = teacher.id;
                        payload.status = 'present';
                        payload.date = new Date().toISOString().split('T')[0];
                    }
                } else if (table === 'notices') {
                    payload.title = 'Test Notice';
                    payload.content = 'Test Content';
                    payload.audience = ['All'];
                }

                if (Object.keys(payload).length > 1) {
                    const { error: insertError } = await supabase.from(table).insert([payload]);
                    if (insertError) {
                        insertStatus = insertError.message.includes('permission denied') ? '❌' : '⚠️';
                        errors.push(`[${table} INSERT] ${insertError.message} (${insertError.code})`);
                    } else {
                        insertStatus = '✅';
                    }
                } else {
                    insertStatus = '🚫';
                }
            } else {
                insertStatus = '➖';
            }

        } catch (err) {
            console.error(`Error testing ${table}:`, err);
        }

        console.log(`| ${table.padEnd(25)} | ${readStatus}    | ${updateStatus}      | ${insertStatus}      |`);
    }
    console.log('--------------------------------------------------');
    console.log('\nLegend: ✅ Success | ❌ Permission Denied | ⚠️ Other Error | ⏳ Skipped | 🚫 No Data/Criteria | ➖ Not Tested');

    if (errors.length > 0) {
        console.log('\nDetailed Error Logs:');
        errors.forEach(err => console.log(err));
    }
}

runDiagnostics();
