
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const TEST_CONFIG = {
    schoolId: 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1',
    teacherId: '22222222-2222-2222-2222-222222222222',
    studentId: '95e66ee4-4750-4bfe-9ec4-e6a76d011582', // Student ID from students table
    studentUserId: '11111111-1111-1111-1111-111111111111' // User ID from auth.users (profiles table)
};

async function testCBTFlow() {
    console.log('Starting CBT/Quiz Backend Test...');

    try {
        console.log('\n1. Fetching published quizzes...');
        const { data: quizzes, error: qError } = await supabase
            .from('quizzes')
            .select('*')
            .eq('school_id', TEST_CONFIG.schoolId)
            .eq('is_published', true);

        if (qError) {
            console.error('❌ Error fetching quizzes:', qError);
            return;
        }

        console.log('✅ Found ' + (quizzes?.length || 0) + ' published quizzes.');
        if (quizzes && quizzes.length > 0) {
            const quiz = quizzes[0];
            console.log('   Sample Quiz: ' + quiz.title + ' (' + quiz.id + ')');

            console.log('\n2. Fetching questions for quiz...');
            const { data: questions, error: questError } = await supabase
                .from('quiz_questions')
                .select('*')
                .eq('quiz_id', quiz.id);

            if (questError) {
                console.error('❌ Error fetching questions:', questError);
                return;
            }

            console.log('✅ Found ' + (questions?.length || 0) + ' questions.');

            console.log('\n3. Simulating Submission (Backend part)');
            const submission = {
                quiz_id: quiz.id,
                student_id: TEST_CONFIG.studentUserId, // FIX: Use studentUserId here
                school_id: TEST_CONFIG.schoolId,
                score: 85,
                total_questions: questions?.length || 1,
                answers: { test: "data" },
                status: 'graded',
                submitted_at: new Date().toISOString()
            };

            console.log('   Submission payload: ' + JSON.stringify(submission, null, 2));
            
            console.log('   Attempting to insert submission...');
            const { data: subResult, error: subError } = await supabase
                .from('quiz_submissions')
                .insert([submission]);

            if (subError) {
                if (subError.code === '42501') {
                    console.warn('⚠️ Submission blocked by RLS (Expected for anon key). Ensure authenticated user.');
                } else if (subError.code === '23502') { 
                    console.error('❌ Submission failed: Missing required column or RLS (e.g. total_questions not existing before migration).', subError);
                } else if (subError.code === '23503') {
                    console.error('❌ Submission failed: Foreign key violation. Check student_id against profiles table.', subError);
                }
                 else {
                    console.error('❌ Submission failed with error:', subError);
                }
            } else {
                console.log('✅ Submission successful! Submission ID: ' + subResult?.[0]?.id);
            }
        } else {
            console.warn('⚠️ No published quizzes found for testing. Please create one via the UI.');
        }

    } catch (err) {
        console.error('💥 Unexpected Error during test:', err);
    }

    console.log('\n🏁 Test sequence complete.');
}

testCBTFlow();
