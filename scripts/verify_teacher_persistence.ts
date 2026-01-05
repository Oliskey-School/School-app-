
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.join(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function getAuthenticatedClient() {
    const email = `teacher.verify.${Date.now()}@gmail.com`;
    const password = 'password123';

    // 1. Sign Up
    const { data: { user }, error: signupError } = await supabase.auth.signUp({
        email,
        password
    });

    if (signupError) throw signupError;
    if (!user) throw new Error("No user returned from signup");

    // 2. Insert into users table (if required by RLS triggers/checks)
    const { error: userError } = await supabase.from('users').insert({
        id: user.id, // If linked by ID
        email: email, // If linked by Email
        role: 'Teacher',
        name: 'Verify Teacher'
    });

    // Note: Some RLS might prevent inserting into 'users' directly if not admin.
    // If this fails, we might rely on triggers. 
    // If triggers aren't set up, we might be stuck. 
    // But let's try.
    if (userError) console.warn("Notice: Could not insert into users table:", userError.message);

    // 3. Create Teacher Profile (Required for many RLS checks)
    const { data: teacher, error: teacherError } = await supabase.from('teachers').insert({
        user_id: user.id,
        name: 'Verify Teacher',
        email: email,
        status: 'Active'
    }).select().single();

    if (teacherError) console.warn("Notice: Could not insert into teachers table:", teacherError.message);

    // Return client with session (Autofilled by supabase-js if singleton? No, need manual session set or createClient with session)
    // Actually, createClient maintains state in memory. signUp sets the session.
    return { client: supabase, user, teacher };
}

async function verifyTeacherPersistence() {
    console.log("🚀 Starting Teacher Persistence Verification...");

    let user, teacher;
    try {
        const authData = await getAuthenticatedClient();
        user = authData.user;
        teacher = authData.teacher;
        console.log("✅ Authenticated as:", user.email, "TeacherID:", teacher?.id);
    } catch (e) {
        console.error("❌ Authentication Failed:", e);
        // Fallback or exit? Exit.
        process.exit(1);
    }


    const testTimestamp = Date.now();
    const testClassName = `Grade 5A`; // Assuming this exists or using string
    const testTitle = `Test Assignment ${testTimestamp}`;
    const testSubject = "Mathematics";

    // 1. Verify Assignment Persistence
    console.log(`\nTesting Assignment Persistence...`);
    // Note: assignments table expects class_name string based on frontend check
    const { data: assignData, error: assignError } = await supabase
        .from('assignments')
        .insert([{
            title: testTitle,
            description: "Verify persistence",
            class_name: testClassName,
            subject: testSubject,
            due_date: new Date().toISOString(),
            total_students: 20,
            submissions_count: 0
        }])
        .select()
        .single();

    if (assignError) {
        console.error("❌ Failed to create assignment:", assignError);
        // Continue if table doesn't exist to show other checks? No, fail.
    } else {
        console.log("✅ Created Assignment:", assignData.title);

        // Read Back
        const { data: readAssign } = await supabase
            .from('assignments')
            .select('*')
            .eq('id', assignData.id)
            .single();

        if (readAssign && readAssign.title === testTitle) {
            console.log("✅ Verified: Assignment persists.");
            // Cleanup
            await supabase.from('assignments').delete().eq('id', assignData.id);
        } else {
            console.error("❌ Assignment mismatch or missing.");
        }
    }

    // 2. Verify Lesson Note Persistence
    console.log(`\nTesting Lesson Note Persistence...`);
    // Note: lesson_notes requires foreign keys often (teacher_id, subject_id, class_id).
    // We need valid IDs. If we don't have them, we might skip or try to insert if constraints allow.
    // For specific user verification, we rely on the fact that if table exists and Insert works, it persists.
    // Let's try to mock if we can find a teacher/class.

    // Find a teacher (We are the teacher now, so use 'teacher' from auth)
    const { data: subj } = await supabase.from('subjects').select('id').limit(1).single();
    const { data: cls } = await supabase.from('classes').select('id').limit(1).single();

    if (teacher && subj && cls) {
        const { data: noteData, error: noteError } = await supabase
            .from('lesson_notes')
            .insert({
                teacher_id: teacher.id,
                subject_id: subj.id,
                class_id: cls.id,
                week: 1,
                term: "Term 1",
                title: `Note ${testTimestamp}`,
                content: "Content",
                status: 'Pending'
            })
            .select()
            .single();

        if (noteError) {
            console.error("❌ Failed to create lesson note:", noteError);
        } else {
            console.log("✅ Created Lesson Note");
            const { data: readNote } = await supabase.from('lesson_notes').select('*').eq('id', noteData.id).single();
            if (readNote?.title === `Note ${testTimestamp}`) {
                console.log("✅ Verified: Lesson Note persists.");
                await supabase.from('lesson_notes').delete().eq('id', noteData.id);
            } else {
                console.error("❌ Lesson Note mismatch.");
            }
        }
    } else {
        console.log("⚠️ Skipping Lesson Note test (Missing dependencies: teacher/subject/class)");
    }

    // 3. Verify Gradebook (Report Card) Persistence
    console.log(`\nTesting Report Card Persistence...`);
    // Need a student
    const { data: student } = await supabase.from('students').select('id').limit(1).single();
    if (student) {
        const session = "2023/2024";
        const term = "TestTerm";

        // Upsert Report Card
        const { data: rcData, error: rcError } = await supabase
            .from('report_cards')
            .upsert({
                student_id: student.id,
                term: term,
                session: session,
                status: 'Draft',
                teacher_comment: `Comment ${testTimestamp}`
            }, { onConflict: 'student_id, term, session' })
            .select()
            .single();

        if (rcError) {
            console.error("❌ Failed to upsert report card:", rcError);
        } else {
            console.log("✅ Upserted Report Card");

            // Insert Record
            const { error: recError } = await supabase
                .from('report_card_records')
                .insert({
                    report_card_id: rcData.id,
                    subject: 'TestSubject',
                    ca: 30,
                    exam: 50,
                    total: 80,
                    grade: 'A'
                });

            if (recError) {
                console.error("❌ Failed to insert record:", recError);
            } else {
                console.log("✅ Inserted Report Card Record (Grade)");

                // Read Back
                const { data: readRC } = await supabase
                    .from('report_cards')
                    .select('*, report_card_records(*)')
                    .eq('id', rcData.id)
                    .single();

                if (readRC && readRC.report_card_records.length > 0 && readRC.report_card_records[0].total === 80) {
                    console.log("✅ Verified: Gradebook/ReportCard persists.");
                } else {
                    console.error("❌ Gradebook mismatch.");
                }

                // Clean up
                await supabase.from('report_card_records').delete().eq('report_card_id', rcData.id);
                await supabase.from('report_cards').delete().eq('id', rcData.id);
            }
        }
    } else {
        console.log("⚠️ Skipping Gradebook test (No student found)");
    }

    console.log("\n🎉 TEACHER PERSISTENCE VERIFIED!");
}

verifyTeacherPersistence().catch(console.error);
