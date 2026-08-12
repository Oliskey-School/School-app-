const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function audit() {
    try {
        console.log('Logging in as Teacher...');
        const loginResponse = await axios.post(`${API_URL}/auth/login`, {
            email: 'john.smith@demo.com',
            password: 'password123'
        }, { withCredentials: true });
        
        const cookies = loginResponse.headers['set-cookie'];
        const accessTokenCookie = cookies.find(c => c.startsWith('access_token='));
        const token = accessTokenCookie.split(';')[0].split('=')[1];
        
        console.log('Login successful, teacher token obtained.');

        const headers = { 'Authorization': `Bearer ${token}` };
        const teacher = loginResponse.data.user;
        const schoolId = teacher.school_id;

        console.log('--- Testing Class & Subject Management ---');
        const teacherProfileResponse = await axios.get(`${API_URL}/teachers/me`, { headers });
        const classMappings = teacherProfileResponse.data.classes || [];
        console.log('Assigned classes:', classMappings.length);
        
        if (classMappings.length === 0) {
            console.warn('Teacher has no assigned classes. This might affect other tests.');
        }

        const targetClass = classMappings[0] ? { id: classMappings[0].class_id, branch_id: classMappings[0].branch_id } : { id: 'class-10-A', branch_id: teacher.branch_id };
        console.log(`Target class: ${targetClass.id}`);

        console.log('--- Testing Attendance Tracking ---');
        const studentsResponse = await axios.get(`${API_URL}/students?classId=${targetClass.id}`, { headers });
        const students = studentsResponse.data;
        console.log(`Students in class ${targetClass.id}: ${students.length}`);

        if (students.length > 0) {
            console.log('Recording attendance...');
            const today = new Date().toISOString().split('T')[0];
            const attendanceRecords = students.map(s => ({
                student_id: s.id,
                class_id: targetClass.id,
                date: today,
                status: 'Present'
            }));
            await axios.post(`${API_URL}/attendance`, { records: attendanceRecords }, { headers });
            console.log('✅ Attendance recording verified!');
        }

        console.log('--- Testing Assignment Management ---');
        const testAssignmentTitle = `Audit Assignment ${Date.now()}`;
        console.log(`Creating assignment: ${testAssignmentTitle}...`);
        const assignmentData = {
            class_id: targetClass.id,
            title: testAssignmentTitle,
            subject: 'Mathematics',
            due_date: new Date(Date.now() + 7 * 86400000).toISOString(),
            description: 'Please complete the exercises on page 42.',
            total_marks: 100
        };
        const createAssignmentResponse = await axios.post(`${API_URL}/assignments`, assignmentData, { headers });
        console.log('Assignment created:', createAssignmentResponse.data.id);

        console.log('Verifying assignment persistence...');
        const verifyAssignmentsResponse = await axios.get(`${API_URL}/assignments?classId=${targetClass.id}`, { headers });
        const assignmentFound = verifyAssignmentsResponse.data.find(a => a.title === testAssignmentTitle);
        
        if (assignmentFound) {
            console.log('✅ Assignment persistence verified!');
        } else {
            throw new Error('❌ Assignment persistence FAILED!');
        }

        console.log('--- Audit Complete ---');
    } catch (error) {
        console.error('Audit failed:', error.response ? error.response.data : error.message);
    }
}

audit();
