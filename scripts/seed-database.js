
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedDatabase() {
    console.log('🌱 Starting Seed Process...');

    // 1. Clean up (Optional, be careful in prod, but safe for dev tool)
    console.log('Cleaning up existing data...');
    // Delete in reverse order of dependencies
    await supabase.from('parent_children').delete().neq('id', 0);
    await supabase.from('teacher_classes').delete().neq('id', 0);
    await supabase.from('students').delete().neq('id', 0);
    await supabase.from('teachers').delete().neq('id', 0);
    await supabase.from('parents').delete().neq('id', 0);
    await supabase.from('users').delete().neq('id', 0);
    await supabase.from('classes').delete().neq('id', '0');

    // 2. Insert Users
    console.log('Inserting Users...');
    const usersData = [
        { email: 'admin@school.com', name: 'Admin User', role: 'Admin' },
        { email: 'j.adeoye@school.com', name: 'Mr. John Adeoye', role: 'Teacher' },
        { email: 'f.akintola@school.com', name: 'Mrs. Funke Akintola', role: 'Teacher' },
        { email: 'p.okonkwo@gmail.com', name: 'Mr. Peter Okonkwo', role: 'Parent' },
        { email: 'adebayo@student.school.com', name: 'Adebayo Oluwaseun', role: 'Student' },
        { email: 'chidinma@student.school.com', name: 'Chidinma Okafor', role: 'Student' },
        { email: 'musa@student.school.com', name: 'Musa Ibrahim', role: 'Student' } // Added line
    ];

    // Using upsert based on email could be tricky if ID is auto-gen, but we are deleting first so just insert.
    const { data: users, error: userError } = await supabase.from('users').insert(usersData).select();
    if (userError) throw userError;

    // Map emails to IDs
    const userMap = {};
    users.forEach(u => userMap[u.email] = u.id);

    // 3. Teachers
    console.log('Inserting Teachers...');
    const teachersData = [
        { user_id: userMap['j.adeoye@school.com'], name: 'Mr. John Adeoye', email: 'j.adeoye@school.com', status: 'Active' },
        { user_id: userMap['f.akintola@school.com'], name: 'Mrs. Funke Akintola', email: 'f.akintola@school.com', status: 'Active' }
    ];
    const { data: teachers, error: teacherError } = await supabase.from('teachers').insert(teachersData).select();
    if (teacherError) throw teacherError;

    // Map email to teacher ID
    const teacherMap = {};
    teachers.forEach(t => teacherMap[t.email] = t.id);

    // 3b. Teacher Classes
    console.log('Inserting Teacher Classes...');
    const teacherClasses = [
        { teacher_id: teacherMap['j.adeoye@school.com'], class_name: 'Grade 7 - math' },
        { teacher_id: teacherMap['j.adeoye@school.com'], class_name: 'Grade 8 - math' },
        { teacher_id: teacherMap['j.adeoye@school.com'], class_name: 'Grade 9 - math' },
        { teacher_id: teacherMap['j.adeoye@school.com'], class_name: 'Grade 10 - math' },
        { teacher_id: teacherMap['j.adeoye@school.com'], class_name: 'Grade 11 - math' }
    ];
    await supabase.from('teacher_classes').insert(teacherClasses);

    // 4. Classes (Full Range)
    console.log('Inserting Classes (Nursery to SSS3)...');
    const classesData = [
        // Early Years
        { id: '1', subject: 'Activity Areas', grade: 0, section: 'A', department: null, student_count: 15 },
        { id: '2', subject: 'Activity Areas', grade: 1, section: 'A', department: null, student_count: 15 },
        { id: '3', subject: 'Activity Areas', grade: 2, section: 'A', department: null, student_count: 20 },
        // Primary
        { id: '4', subject: 'Core Subjects', grade: 3, section: 'A', department: null, student_count: 25 },
        { id: '5', subject: 'Core Subjects', grade: 4, section: 'A', department: null, student_count: 25 },
        { id: '6', subject: 'Core Subjects', grade: 5, section: 'A', department: null, student_count: 25 },
        { id: '7', subject: 'Core Subjects', grade: 6, section: 'A', department: null, student_count: 25 },
        { id: '8', subject: 'Core Subjects', grade: 7, section: 'A', department: null, student_count: 30 },
        { id: '9', subject: 'Core Subjects', grade: 8, section: 'A', department: null, student_count: 30 },
        // JSS
        { id: '10', subject: 'Core Subjects', grade: 9, section: 'A', department: null, student_count: 35 },
        { id: '11', subject: 'Core Subjects', grade: 10, section: 'A', department: null, student_count: 35 },
        { id: '12', subject: 'Core Subjects', grade: 11, section: 'A', department: null, student_count: 35 },
        // SSS
        { id: '13', subject: 'Combined', grade: 12, section: 'A', department: 'Science', student_count: 40 },
        { id: '14', subject: 'Combined', grade: 12, section: 'A', department: 'Arts', student_count: 40 },
        { id: '15', subject: 'Combined', grade: 12, section: 'A', department: 'Commercial', student_count: 40 },
        { id: '16', subject: 'Combined', grade: 13, section: 'A', department: 'Science', student_count: 40 },
        { id: '17', subject: 'Combined', grade: 13, section: 'A', department: 'Arts', student_count: 40 },
        { id: '18', subject: 'Combined', grade: 13, section: 'A', department: 'Commercial', student_count: 40 },
        { id: '19', subject: 'Combined', grade: 14, section: 'A', department: 'Science', student_count: 40 },
        { id: '20', subject: 'Combined', grade: 14, section: 'A', department: 'Arts', student_count: 40 },
        { id: '21', subject: 'Combined', grade: 14, section: 'A', department: 'Commercial', student_count: 40 }
    ];
    await supabase.from('classes').insert(classesData);

    // 5. Students
    console.log('Inserting Students...');
    const studentsData = [
        { user_id: userMap['adebayo@student.school.com'], name: 'Adebayo Oluwaseun', grade: 10, section: 'A', department: 'Science', attendance_status: 'Present' },
        { user_id: userMap['chidinma@student.school.com'], name: 'Chidinma Okafor', grade: 10, section: 'A', department: 'Science', attendance_status: 'Present' },
        { user_id: userMap['musa@student.school.com'], name: 'Musa Ibrahim', grade: 9, section: 'A', department: null, attendance_status: 'Absent' }
    ];
    const { data: students, error: studentError } = await supabase.from('students').insert(studentsData).select();
    if (studentError) throw studentError;

    // 6. Parents & Relationship
    console.log('Inserting Parents...');
    const parentsData = [
        { user_id: userMap['p.okonkwo@gmail.com'], name: 'Mr. Peter Okonkwo', email: 'p.okonkwo@gmail.com', phone: '08012345678' }
    ];
    const { data: parents } = await supabase.from('parents').insert(parentsData).select();
    const parentId = parents[0].id;

    // Find Adebayo's ID
    const studentAdebayo = students.find(s => s.name === 'Adebayo Oluwaseun');
    if (studentAdebayo) {
        await supabase.from('parent_children').insert({ parent_id: parentId, student_id: studentAdebayo.id });
    }

    console.log('✅ Database seeded successfully!');
}

seedDatabase().catch(err => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
});
