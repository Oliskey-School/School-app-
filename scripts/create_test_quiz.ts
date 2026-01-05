
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createTestQuiz() {
    console.log("🚀 Creating Test Quiz...");

    // 1. Login Teacher
    const email = 'j.adeoye@school.com';
    const password = 'password123';

    const { data: { user }, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !user) {
        console.error("Login failed:", error);
        return;
    }
    console.log("Login successful:", user.id);

    // 2. Get Teacher Profile
    const { data: teacher } = await supabase.from('teachers').select('id').eq('user_id', user.id).single();
    if (!teacher) {
        // Try creating if missing (backfill)
        console.log("Teacher profile missing, creating...");
        await supabase.from('users').upsert({ email, role: 'Teacher', name: 'John Adeoye', supabase_uid: user.id });
        const { data: newTeacher } = await supabase.from('teachers').insert({ user_id: user.id, email, name: 'John Adeoye' }).select().single();
        if (!newTeacher) throw new Error("Could not create teacher profile");
        // retry
        return createTestQuiz();
    }

    // 3. Create Quiz
    const { data: quiz, error: quizError } = await supabase.from('quizzes').insert({
        title: `Browser Test Quiz ${Date.now()}`,
        subject: 'Math',
        is_published: true,
        teacher_id: teacher.id,
        duration_questions: 5,
        duration_minutes: 10
    }).select().single();

    if (quizError) {
        console.error("Quiz creation error:", quizError);
    } else {
        console.log("✅ Quiz Created:", quiz.title);

        // 4. Create Questions for the quiz?
        // QuizPlayerScreen needs questions to run?
        // It fetches 'questions' table via quiz_id?
        // Let's inspect QuizPlayer again? 
        // Yes, it fetches questions.

        await supabase.from('questions').insert([
            {
                quiz_id: quiz.id,
                text: 'What is 2+2?',
                type: 'MultipleChoice',
                options: JSON.stringify([{ id: 'a', text: '3' }, { id: 'b', text: '4', isCorrect: true }]),
                points: 5
            },
            {
                quiz_id: quiz.id,
                text: 'Is the sky blue?',
                type: 'TrueFalse',
                options: JSON.stringify([{ id: 'true', text: 'True', isCorrect: true }, { id: 'false', text: 'False' }]),
                points: 5
            }
        ]);
        console.log("✅ Questions Added");
    }
}

createTestQuiz();
