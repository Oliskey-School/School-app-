/**
 * Test ALL four backend endpoints for the demo school.
 * This verifies that the backend returns real data for teachers, students, parents, and classes.
 */
import { TeacherService } from './backend/src/services/teacher.service';
import { StudentService } from './backend/src/services/student.service';
import { ParentService } from './backend/src/services/parent.service';
import { ClassService } from './backend/src/services/class.service';

const DEMO_SCHOOL = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';
const DEMO_BRANCH = '7601cbea-e1ba-49d6-b59b-412a584cb94f';

async function testAll() {
    console.log('=== TESTING ALL FOUR ENDPOINTS ===\n');

    try {
        // 1. Teachers
        console.log('1️⃣ TEACHERS:');
        const teachers = await TeacherService.getAllTeachers(DEMO_SCHOOL, DEMO_BRANCH);
        console.log(`   ✅ Count: ${teachers.length}`);
        if (teachers.length > 0) console.log(`   First: ${teachers[0].name}`);
    } catch (e: any) {
        console.error(`   ❌ Error: ${e.message}`);
    }

    try {
        // 2. Students
        console.log('\n2️⃣ STUDENTS:');
        const students = await StudentService.getAllStudents(DEMO_SCHOOL, DEMO_BRANCH);
        console.log(`   ✅ Count: ${students.length}`);
        if (students.length > 0) console.log(`   First: ${students[0].name}`);
    } catch (e: any) {
        console.error(`   ❌ Error: ${e.message}`);
    }

    try {
        // 3. Parents
        console.log('\n3️⃣ PARENTS:');
        const parents = await ParentService.getParents(DEMO_SCHOOL, DEMO_BRANCH);
        console.log(`   ✅ Count: ${parents.length}`);
        if (parents.length > 0) console.log(`   First: ${parents[0].name}`);
    } catch (e: any) {
        console.error(`   ❌ Error: ${e.message}`);
    }

    try {
        // 4. Classes
        console.log('\n4️⃣ CLASSES:');
        const classes = await ClassService.getClasses(DEMO_SCHOOL, DEMO_BRANCH);
        console.log(`   ✅ Count: ${classes.length}`);
        if (classes.length > 0) console.log(`   First: ${classes[0].name}`);
    } catch (e: any) {
        console.error(`   ❌ Error: ${e.message}`);
    }

    console.log('\n=== TEST COMPLETE ===');
}

testAll();
