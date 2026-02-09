
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

// 1. Initialize Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase env variables!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
    console.log('🚀 Starting Integration Test: Quiz Unification');

    // MOCK DATA
    const mockTeacherId = 'd0c9b7e7-3b9a-4b9b-8e7a-9b8c7d6e5f4a'; // Example UUID, might need real one if foreign keys enforced
    const mockSchoolId = 'fa9bc997-21cb-4d8a-988a-a1e698e04e87'; // Demo School ID
    const testQuizTitle = `Integration Test Quiz ${Date.now()}`;

    // 2. SIMULATE TEACHER: Create Quiz
    console.log('\n📝 [Step 1] Creating Quiz...');
    const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .insert([{
            title: testQuizTitle,
            subject: 'Testing',
            school_id: mockSchoolId,
            description: 'Automated Integration Test',
            duration_minutes: 10,
            is_published: true,
            is_active: true
        }])
        .select()
        .single();

    if (quizError) {
        console.error('❌ Failed to create quiz:', quizError);
        // If teacher_id is required foreign key, we might fail here if we don't have a valid one.
        // But let's see. 'teachers' table usually links to auth.users or similar.
        // We will fallback to fetching a real teacher if this fails.
        return;
    }
    console.log('✅ Quiz Created:', quizData.id);

    // 3. SIMULATE TEACHER: Add Questions (Using NEW Schema `quiz_questions`)
    console.log('\n📝 [Step 2] Adding Questions to `quiz_questions`...');
    const questionsPayload = [
        {
            quiz_id: quizData.id,
            question_text: 'What is 2 + 2?',
            question_type: 'multiple_choice',
            marks: 5,
            options: [
                { id: '1', text: '3', isCorrect: false },
                { id: '2', text: '4', isCorrect: true },
                { id: '3', text: '5', isCorrect: false }
            ],
            correct_answer: '2',
            question_order: 1
        }
    ];

    const { error: qError } = await supabase
        .from('quiz_questions')
        .insert(questionsPayload);

    if (qError) {
        console.error('❌ Failed to insert questions:', qError);
        return;
    }
    console.log('✅ Questions Inserted successfully into `quiz_questions`.');


    // 4. SIMULATE STUDENT: Fetch Questions (Using Player Logic)
    console.log('\n🎓 [Step 3] Fetching Questions as Student...');

    // Player selects from `quiz_questions`
    const { data: fetchedQuestions, error: fetchError } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quizData.id);

    if (fetchError) {
        console.error('❌ Failed to fetch questions:', fetchError);
        return;
    }

    if (!fetchedQuestions || fetchedQuestions.length === 0) {
        console.error('❌ No questions returned!');
        return;
    }

    const q = fetchedQuestions[0];
    console.log('📋 Fetched Question:', q);

    // 5. VALIDATE FIELDS
    console.log('\n🔍 [Step 4] Validating Data Integrity...');

    let passed = true;

    // Check Text
    if (q.question_text !== 'What is 2 + 2?') {
        console.error('❌ Mismatch: question_text');
        passed = false;
    } else {
        console.log('✅ question_text matches');
    }

    // Check Marks
    if (q.marks !== 5) {
        console.error('❌ Mismatch: marks');
        passed = false;
    } else {
        console.log('✅ marks matches');
    }

    // Check Options (JSONB)
    if (!Array.isArray(q.options) || q.options.length !== 3) {
        console.error('❌ Mismatch: options structure');
        passed = false;
    } else {
        console.log('✅ options structure matches');
    }

    if (passed) {
        console.log('\n🎉 SUCCESS! Frontend (Builder) <-> Backend (DB) <-> Frontend (Player) flow verified.');
    } else {
        console.error('\n⚠️ TEST FAILED.');
    }

    // CLEANUP
    console.log('\n🧹 Cleaning up...');
    await supabase.from('quizzes').delete().eq('id', quizData.id);
    console.log('✅ Cleanup done.');
}

runTest();
