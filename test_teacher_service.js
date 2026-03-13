
const { TeacherService } = require('./backend/src/services/teacher.service');

async function test() {
    const schoolId = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';
    const branchId = '7601cbea-e1ba-49d6-b59b-412a584cb94f';

    console.log('Testing TeacherService.getAllTeachers with source files...');
    try {
        const teachers = await TeacherService.getAllTeachers(schoolId, branchId);
        console.log('Result count:', teachers.length);
        if (teachers.length > 0) {
            console.log('First teacher name:', teachers[0].name);
            console.log('First teacher ID:', teachers[0].id);
        }
    } catch (err) {
        console.error('Error:', err);
    }
}

test();
