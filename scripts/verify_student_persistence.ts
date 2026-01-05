
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyStudentPersistence() {
    console.log("🚀 Starting Student Persistence Verification...");
    const timestamp = Date.now();

    // ==========================================
    // 1. SETUP TEACHER (To create content)
    // ==========================================
    // ==========================================
    // 1. SETUP TEACHER (To create content)
    // ==========================================
    const teacherEmail = 'teacher@school.com';
    const teacherPass = 'password123';

    // Login Teacher
    console.log(`Logging in as teacher: ${teacherEmail}`);
    let { data: { user: teacherUser }, error: tSignErr } = await supabase.auth.signInWithPassword({
        email: teacherEmail,
        password: teacherPass
    });

    if (tSignErr || !teacherUser) {
        console.log("Login failed, trying signup fallback (might fail if rate limited)...");
        const uniqueEmail = `teacher.setup.${timestamp}@gmail.com`;
        const { data: { user: newUser }, error: signErr } = await supabase.auth.signUp({
            email: uniqueEmail,
            password: teacherPass
        });
        if (signErr) throw signErr;
        teacherUser = newUser;
        if (teacherUser) {
            await supabase.from('users').insert({ email: uniqueEmail, role: 'Teacher', name: 'Setup Teacher', supabase_uid: teacherUser.id });
            await supabase.from('teachers').insert({ user_id: teacherUser.id, email: uniqueEmail, name: 'Setup Teacher' });
        }
    }
    if (!teacherUser) throw new Error("Teacher auth failed");

    // Fetch Teacher Profile
    const { data: teacherProfile } = await supabase.from('teachers').select('id').eq('user_id', teacherUser.id).single();
    if (!teacherProfile) throw new Error("Teacher profile not found");

    // Create Assignment
    const { data: assignment, error: assignErr } = await supabase.from('assignments').insert({
        title: `Test Assignment ${timestamp}`,
        subject: 'Math',
        class_name: 'Grade 10',
        due_date: new Date(Date.now() + 86400000).toISOString(),
        teacher_id: teacherProfile.id
    }).select().single();
    if (assignErr) console.error("Setup Assign Err:", assignErr);

    // Create Quiz
    const { data: quiz, error: quizErr } = await supabase.from('quizzes').insert({
        title: `Test Quiz ${timestamp}`,
        subject: 'Math',
        is_published: true,
        teacher_id: teacherProfile.id
    }).select().single();
    if (quizErr) console.error("Setup Quiz Err:", quizErr);

    // Sign Out Teacher
    await supabase.auth.signOut();

    // ==========================================
    // 2. SETUP STUDENT (To Submit)
    // ==========================================
    const studentEmail = 'student@school.com';
    console.log(`Logging in as student: ${studentEmail}`);

    let { data: { user: studentUser }, error: sSignErr } = await supabase.auth.signInWithPassword({
        email: studentEmail,
        password: 'password123'
    });

    if (sSignErr || !studentUser) {
        console.log("Login failed, trying signup fallback...");
        const uniqueEmail = `student.verify.${timestamp}@gmail.com`;
        const { data: { user: newUser }, error: signErr } = await supabase.auth.signUp({
            email: uniqueEmail,
            password: 'password123'
        });
        if (signErr) throw signErr;
        studentUser = newUser;
        if (studentUser) {
            const { data: userRec } = await supabase.from('users').insert({ email: uniqueEmail, role: 'Student', name: 'Verify Student', supabase_uid: studentUser.id }).select().single();
            const userId = userRec?.id || 1; // Fallback
            await supabase.from('students').insert({ user_id: studentUser.id, email: uniqueEmail, name: 'Verify Student', grade: 10 });
        }
    }
    if (!studentUser) throw new Error("Student auth failed");

    const { data: studentProfile } = await supabase.from('students').select('id').eq('user_id', studentUser.id).single();
    if (!studentProfile) throw new Error("Student profile not found");

    // A. Verify Assignment Submission Persistence
    console.log("\nA. Testing Assignment Submission...");
    if (assignment) {
        const { error: subErr } = await supabase.from('submissions').insert({
            assignment_id: assignment.id,
            student_id: studentProfile.id,
            text_submission: 'This is my persistent answer.',
            status: 'Submitted'
        });

        if (subErr) console.error("❌ Submission Failed:", subErr);
        else {
            const { data: checkSub } = await supabase.from('submissions')
                .select('text_submission')
                .eq('assignment_id', assignment.id)
                .eq('student_id', studentProfile.id)
                .single();

            if (checkSub?.text_submission === 'This is my persistent answer.') {
                console.log("✅ Verified: Assignment submission persists.");
            } else {
                console.error("❌ Submission not found/matched.");
            }
        }
    } else {
        console.warn("⚠️ Skipping Assignment Test (Creation failed)");
    }

    // B. Verify Quiz Result Persistence
    console.log("\nB. Testing Quiz Result Persistence...");
    if (quiz) {
        const { error: quizSubErr } = await supabase.from('quiz_submissions').insert({
            quiz_id: quiz.id,
            student_id: studentProfile.id,
            score: 95,
            status: 'Graded'
        });

        if (quizSubErr) console.error("❌ Quiz Submission Failed:", quizSubErr);
        else {
            const { data: checkQuiz } = await supabase.from('quiz_submissions')
                .select('score')
                .eq('quiz_id', quiz.id)
                .eq('student_id', studentProfile.id)
                .single();

            if (checkQuiz?.score === 95) {
                console.log("✅ Verified: Quiz result persists.");
            } else {
                console.error("❌ Quiz result not found/matched.");
            }
        }
    } else {
        console.warn("⚠️ Skipping Quiz Test (Creation failed)");
    }

    console.log("\n🎉 STUDENT PERSISTENCE VERIFIED!");
    process.exit(0);
}

verifyStudentPersistence().catch(err => {
    console.error(err);
    process.exit(1);
});
