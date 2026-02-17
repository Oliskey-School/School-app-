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
            } else {
                readStatus = '✅';
            }

            // 2. Test Update (on first record if exists)
            if (readData && readData.length > 0) {
                const id = readData[0].id;
                // Try updating a dummy field or existing field
                const updatePayload = {};
                if ('status' in readData[0]) updatePayload.status = readData[0].status;
                else if ('name' in readData[0]) updatePayload.name = readData[0].name;
                else if ('title' in readData[0]) updatePayload.title = readData[0].title;

                if (Object.keys(updatePayload).length > 0) {
                    const { error: updateError } = await supabase.from(table).update(updatePayload).eq('id', id);
                    if (updateError) {
                        updateStatus = updateError.message.includes('permission denied') ? '❌' : '⚠️';
                    } else {
                        updateStatus = '✅';
                    }
                } else {
                    updateStatus = '➖'; // No field to test update
                }
            } else {
                updateStatus = '🚫'; // No data to test update
            }

            // 3. Test Insert (Manual attempt with minimal fields)
            // We only do this for specific tables that are common to avoid too many failures
            const insertTables = ['messages', 'notifications', 'teacher_attendance', 'notices'];
            if (insertTables.includes(table)) {
                let payload = { school_id: schoolId };
                if (table === 'messages') {
                    // Requires conversation_id, sender_id etc, skip for now or mock
                    insertStatus = '⏳';
                } else if (table === 'notifications') {
                    payload.title = 'Test';
                    payload.message = 'Test';
                } else if (table === 'teacher_attendance') {
                    const { data: teacher } = await supabase.from('teachers').select('id').limit(1).single();
                    if (teacher) {
                        payload.teacher_id = teacher.id;
                        payload.status = 'present';
                        payload.date = new Date().toISOString().split('T')[0];
                    }
                } else if (table === 'notices') {
                    payload.title = 'Test Notice';
                    payload.content = 'Test Content';
                }

                if (Object.keys(payload).length > 1) {
                    const { error: insertError } = await supabase.from(table).insert([payload]);
                    if (insertError) {
                        insertStatus = insertError.message.includes('permission denied') ? '❌' : '⚠️';
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
}

runDiagnostics();
