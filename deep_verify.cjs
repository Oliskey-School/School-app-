const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const schoolId = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';

const modules = [
    {
        name: 'Users/Profiles',
        tables: ['users', 'profiles', 'schools']
    },
    {
        name: 'School Management',
        tables: ['teachers', 'students', 'parents', 'classes', 'subjects', 'timetable']
    },
    {
        name: 'Attendance',
        tables: ['teacher_attendance', 'student_attendance']
    },
    {
        name: 'Academic',
        tables: ['assignments', 'assignment_submissions', 'gradebooks', 'assessments', 'report_cards']
    },
    {
        name: 'Communication',
        tables: ['messages', 'conversations', 'notifications', 'notices']
    },
    {
        name: 'Junctions',
        tables: ['teacher_subjects', 'teacher_classes', 'parent_children', 'student_parent_links']
    }
];

async function testJunctionJoins() {
    console.log('\n🔗 Testing Junction Table Joins...');

    const tests = [
        {
            name: 'Teachers with Subjects',
            query: supabase.from('teachers').select('*, teacher_subjects(*, subjects(*))').limit(1)
        },
        {
            name: 'Students with Parents',
            query: supabase.from('students').select('*, student_parent_links(*, parents(*))').limit(1)
        },
        {
            name: 'Parents with Children',
            query: supabase.from('parents').select('*, parent_children(*, students(*))').limit(1)
        }
    ];

    for (const test of tests) {
        const { data, error } = await test.query;
        if (error) {
            console.log(`❌ ${test.name.padEnd(25)}: ${error.message}`);
        } else {
            console.log(`✅ ${test.name.padEnd(25)}: Success (${data.length} records)`);
        }
    }
}

async function runDiagnostics() {
    console.log('🚀 Starting System-Wide CRUD Diagnostics (Anon Key)\n');

    for (const module of modules) {
        console.log(`\n--- Module: ${module.name} ---`);
        console.log('--------------------------------------------------');
        console.log('| Table                     | Read | Update | Insert |');
        console.log('--------------------------------------------------');

        for (const table of module.tables) {
            let readStatus = '❓';
            let updateStatus = '❓';
            let insertStatus = '❓';

            try {
                // 1. Read Test
                const { data: readData, error: readError } = await supabase.from(table).select('*').limit(1);
                if (readError) {
                    readStatus = readError.message.includes('permission denied') ? '❌' : '⚠️';
                } else {
                    readStatus = '✅';
                }

                // 2. Update Test
                if (readData && readData.length > 0 && readStatus === '✅') {
                    const { error: updateError } = await supabase.from(table).update({ id: readData[0].id }).eq('id', readData[0].id);
                    if (updateError) {
                        updateStatus = updateError.message.includes('permission denied') ? '❌' : '⚠️';
                    } else {
                        updateStatus = '✅';
                    }
                } else {
                    updateStatus = readStatus === '✅' ? '🚫' : '➖';
                }

                // 3. Insert Test (Mock for most, Actual for some)
                const { error: insertError } = await supabase.from(table).insert([{ school_id: schoolId }]).select();
                // Note: This will likely fail due to missing fields, but we care if it fails with "permission denied" vs "not-null constraint"
                if (insertError) {
                    if (insertError.message.includes('permission denied')) {
                        insertStatus = '❌';
                    } else if (insertError.message.includes('violates not-null constraint')) {
                        insertStatus = '✅'; // Permission granted, just failed due to data requirements
                    } else if (insertError.message.includes('duplicate key')) {
                        insertStatus = '✅';
                    } else {
                        insertStatus = '⚠️';
                    }
                } else {
                    insertStatus = '✅';
                }

            } catch (err) {
                console.error(`Error testing ${table}:`, err);
            }

            console.log(`| ${table.padEnd(25)} | ${readStatus}    | ${updateStatus}      | ${insertStatus}      |`);
        }
    }

    await testJunctionJoins();

    console.log('\nLegend: ✅ Success/Permission Granted | ❌ Permission Denied | ⚠️ Other Error | 🚫 No Data');
}

runDiagnostics();
